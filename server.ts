import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { curatedTaxa } from "./src/data/curatedTaxa";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Initialize Gemini API client on server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Endpoint to get a quick fun summary of a species
app.post("/api/species-summary", async (req, res) => {
  try {
    const { vernacularName, scientificName } = req.body;
    if (!vernacularName || !scientificName) {
      return res.status(400).json({ error: "Missing species names." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Provide exactly 5 bullet points of the top 5 most interesting facts about the species "${vernacularName}" (${scientificName}). Focus on cool and interesting facts unique to the species. Use a dash (-) for each bullet point. Do not include any other introductory or concluding text.`,
      config: {
        systemInstruction: "You are an expert wildlife communicator creating fun, engaging dossiers for a nature app. Output only the requested bullet points.",
      }
    });

    res.json({ summary: response.text });
  } catch (error) {
    console.error("Gemini summary error:", error);
    res.status(500).json({ error: "Failed to generate species summary." });
  }
});

// Endpoint to scan and extract all species from a zoo informational sign plaque
app.post("/api/scan-sign", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing image data in request." });
    }

    // Clean base64 data if it contains a data URL prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        {
          text: `You are an expert zoologist and optical recognition specialist for wildlife parks and zoos.
Analyze this informational sign / exhibit plaque carefully. Extract every species listed on the sign (there may be 1 or multiple species, such as mixed-species aviaries, African plains exhibits, reptile houses, or multi-species signs).

For each species found on the sign, extract:
1. "vernacularName": The main English common name (e.g., "Wrinkled Hornbill", "Great Hornbill", "Rhinoceros Hornbill").
2. "scientificName": The exact Latin binomial / trinomial name (e.g., "Aceros corrugatus", "Buceros bicornis", "Buceros rhinoceros").
3. "alternateNames": Any other local or indigenous names shown on the sign (e.g., "Julang Jambul Hitam", "Enggang Papan").
4. "iucnStatus": If an IUCN Red List conservation status is shown or known for this taxon ("LC", "NT", "VU", "EN", "CR", "EW", "EX", or "NE").
5. "className": Taxonomic class if known or indicated (e.g., "Aves", "Mammalia", "Reptilia", "Amphibia", "Actinopterygii", "Insecta", "Arachnida").
6. "orderName": Taxonomic order (e.g., "Bucerotiformes", "Carnivora", "Primates", "Psittaciformes", etc.).
7. "familyName": Taxonomic family (e.g., "Bucerotidae", "Felidae", etc.).
8. "genusName": Taxonomic genus (e.g., "Aceros", "Buceros").
9. "notes": Any notable facts from the sign (diet, native range, interesting behavior).

Also extract:
- "exhibitTitle": Any exhibit name or title written on the sign (e.g., "Hornbill Valley", "Hornbill Aviary", "Asian Rainforest", "South East Asia").
- "venueName": Any zoo or park branding if visible (e.g. "Singapore Zoo", "Mandai Wildlife Reserve", "San Diego Zoo", or null).
- "confidence": A high/medium/low confidence score.`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            exhibitTitle: { type: Type.STRING, description: "Suggested name for this enclosure / exhibit" },
            venueName: { type: Type.STRING, description: "Detected zoo or park name if present, else empty string" },
            species: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  vernacularName: { type: Type.STRING },
                  scientificName: { type: Type.STRING },
                  alternateNames: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  iucnStatus: { type: Type.STRING },
                  className: { type: Type.STRING },
                  orderName: { type: Type.STRING },
                  familyName: { type: Type.STRING },
                  genusName: { type: Type.STRING },
                  notes: { type: Type.STRING }
                },
                required: ["vernacularName", "scientificName"]
              }
            }
          },
          required: ["species"]
        }
      }
    });

    const rawText = response.text || "{}";
    const parsed = JSON.parse(rawText);

    // Enrich species with curated taxonomy where available
    const enrichedSpecies = (parsed.species || []).map((sp: any, idx: number) => {
      const match = curatedTaxa.find(t => 
        t.scientificName.toLowerCase() === (sp.scientificName || '').trim().toLowerCase() ||
        t.vernacularName.toLowerCase() === (sp.vernacularName || '').trim().toLowerCase()
      );

      return {
        id: `sp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        scientificName: sp.scientificName || "Unknown species",
        vernacularName: sp.vernacularName || sp.scientificName || "Unknown species",
        alternateNames: sp.alternateNames || [],
        iucnCategory: sp.iucnStatus || match?.iucnCategory || "LC",
        taxonomy: {
          kingdom: match?.kingdom || "Animalia",
          phylum: match?.phylum || "Chordata",
          class: match?.class || sp.className || "Aves",
          order: match?.order || sp.orderName || "",
          family: match?.family || sp.familyName || "",
          genus: match?.genus || sp.genusName || (sp.scientificName ? sp.scientificName.split(' ')[0] : "")
        },
        notes: sp.notes || "",
        isSeen: true // default checked for user convenience
      };
    });

    res.json({
      success: true,
      exhibitTitle: parsed.exhibitTitle || "",
      venueName: parsed.venueName || "",
      species: enrichedSpecies
    });
  } catch (err: any) {
    console.error("Error scanning zoo sign:", err);
    res.status(500).json({ 
      error: "Failed to scan zoo sign. " + (err?.message || "Please check that your image is clear and try again.")
    });
  }
});

// Catalogue of Life (ChecklistBank Dataset 3LR or COL Annual Checklist) proxy search
app.get("/api/taxonomy/search", async (req, res) => {
  const query = (req.query.q as string || "").trim().toLowerCase();
  if (!query || query.length < 2) {
    return res.json({ results: [] });
  }

  // 1. Search in curated database first for instant fuzzy match
  const matchedCurated = curatedTaxa.filter(item => 
    item.scientificName.toLowerCase().includes(query) ||
    item.vernacularName?.toLowerCase().includes(query) ||
    item.family?.toLowerCase().includes(query) ||
    item.order?.toLowerCase().includes(query) ||
    item.genus?.toLowerCase().includes(query)
  );

  // 2. Query Catalogue of Life ChecklistBank API (Dataset 3LR is the latest COL release)
  let liveResults: any[] = [];
  try {
    const colUrl = `https://api.checklistbank.org/dataset/3LR/nameusage/search?q=${encodeURIComponent(query)}&limit=15`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(colUrl, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.result)) {
        liveResults = data.result
          .filter((item: any) => {
            // Only species or infraspecific ranks, or well-defined taxa
            const rank = item.usage?.name?.rank || item.name?.rank || "";
            return ["species", "subspecies", "genus", "family"].includes(rank.toLowerCase());
          })
          .map((item: any) => {
            const usage = item.usage || {};
            const name = usage.name || item.name || {};
            const classification = item.classification || [];

            // Extract classification ranks
            let kingdom = "", phylum = "", className = "", order = "", family = "", genus = "";
            for (const node of classification) {
              const r = (node.rank || "").toLowerCase();
              if (r === "kingdom") kingdom = node.name;
              if (r === "phylum") phylum = node.name;
              if (r === "class") className = node.name;
              if (r === "order") order = node.name;
              if (r === "family") family = node.name;
              if (r === "genus") genus = node.name;
            }

            const vernaculars = (item.vernacularNames || []).map((v: any) => v.name);
            const englishVernacular = item.vernacularNames?.find((v: any) => v.language === "eng")?.name || vernaculars[0] || "";

            return {
              id: `col-${usage.id || name.id || Math.random().toString(36).substring(2, 9)}`,
              colId: usage.id || name.id,
              scientificName: name.scientificName || usage.label || name.formattedName || "Unknown taxon",
              authorship: name.authorship || "",
              rank: name.rank || "species",
              vernacularName: englishVernacular,
              allVernaculars: vernaculars,
              status: usage.status || "accepted",
              kingdom: kingdom || "Animalia",
              phylum: phylum || "Chordata",
              class: className || "",
              order: order || "",
              family: family || "",
              genus: genus || name.genus || "",
              source: "Catalogue of Life (ChecklistBank)"
            };
          });
      }
    }
  } catch (err) {
    // If external CoL call timed out or failed, continue with curated results
    console.warn("ChecklistBank live search fallback:", (err as Error).message);
  }

  // Merge results, deduplicate by scientificName
  const seen = new Set<string>();
  const combined = [];

  for (const item of matchedCurated) {
    const key = item.scientificName.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      combined.push({ ...item, source: "Catalogue of Life Core" });
    }
  }

  for (const item of liveResults) {
    const key = item.scientificName.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(item);
    }
  }

  res.json({ results: combined.slice(0, 20) });
});

// Taxonomy Details endpoint
app.get("/api/taxonomy/details/:id", async (req, res) => {
  const { id } = req.params;
  const found = curatedTaxa.find(t => t.id === id || t.scientificName.toLowerCase() === id.toLowerCase());
  if (found) {
    return res.json({ taxon: found });
  }

  // Try CoL API if numeric id or col- id
  const colId = id.replace("col-", "");
  try {
    const response = await fetch(`https://api.checklistbank.org/dataset/3LR/taxon/${colId}`, {
      headers: { "Accept": "application/json" }
    });
    if (response.ok) {
      const data = await response.json();
      return res.json({ taxon: data });
    }
  } catch (err) {
    // fallback
  }

  res.status(404).json({ error: "Taxon not found" });
});

// Endpoint to fetch images of a species from Wikipedia/Wikimedia/iNaturalist
app.get("/api/species-images", async (req, res) => {
  const query = (req.query.q as string || "").trim();
  if (!query) {
    return res.json({ images: [] });
  }

  const images: { url: string; title: string; isMain: boolean }[] = [];
  const USER_AGENT = "LifeListApp/1.0 (Mozilla/5.0; BiologicalTaxonomyExplorer)";

  // 1. Wikipedia Page Image Search (with redirects enabled)
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|images&titles=${encodeURIComponent(query)}&redirects=1&format=json&pithumbsize=1000&imlimit=10`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    
    const wikiRes = await fetch(wikiUrl, {
      signal: controller.signal,
      headers: { 
        "Accept": "application/json", 
        "User-Agent": USER_AGENT 
      }
    });
    clearTimeout(timeout);
    
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      const pages = wikiData.query?.pages || {};
      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];

      if (page && pageId !== "-1" && page.thumbnail?.source) {
        images.push({ url: page.thumbnail.source, title: query, isMain: true });
      }
    }
  } catch (err) {
    // Gracefully continue to fallback search providers
  }

  // 2. Fallback if main image wasn't found in Wikipedia: Search Wikipedia generator
  if (images.length === 0) {
    try {
      const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&format=json&pithumbsize=1000`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const wikiSearchRes = await fetch(wikiSearchUrl, {
        signal: controller.signal,
        headers: { "Accept": "application/json", "User-Agent": USER_AGENT }
      });
      clearTimeout(timeout);

      if (wikiSearchRes.ok) {
        const data = await wikiSearchRes.json();
        const pages = data.query?.pages || {};
        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];
        if (page && page.thumbnail?.source) {
          images.push({ url: page.thumbnail.source, title: query, isMain: true });
        }
      }
    } catch (err) {
      // Gracefully continue
    }
  }

  // 3. Fallback/Supplement: iNaturalist Taxa API
  try {
    const inatUrl = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&per_page=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const inatRes = await fetch(inatUrl, {
      signal: controller.signal,
      headers: { "Accept": "application/json", "User-Agent": USER_AGENT }
    });
    clearTimeout(timeout);

    if (inatRes.ok) {
      const inatData = await inatRes.json();
      const taxon = inatData.results?.[0];
      
      if (taxon?.default_photo?.medium_url) {
        const photoUrl = taxon.default_photo.medium_url.replace('/medium.', '/large.');
        if (!images.some(img => img.url === photoUrl)) {
          images.push({
            url: photoUrl,
            title: taxon.preferred_common_name || taxon.name,
            isMain: images.length === 0
          });
        }
      }

      if (taxon?.taxon_photos && Array.isArray(taxon.taxon_photos)) {
        for (const tp of taxon.taxon_photos) {
          if (tp.photo?.medium_url) {
            const photoUrl = tp.photo.medium_url.replace('/medium.', '/large.');
            if (!images.some(img => img.url === photoUrl)) {
              images.push({
                url: photoUrl,
                title: tp.photo.attribution || query,
                isMain: images.length === 0
              });
            }
          }
        }
      }
    }
  } catch (err) {
    // Gracefully continue
  }

  // 4. Fetch additional photos from Wikimedia Commons
  try {
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query + ' filetype:bitmap')}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url|extmetadata&format=json&iiurlwidth=800`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const commonsRes = await fetch(commonsUrl, {
      signal: controller.signal,
      headers: { "Accept": "application/json", "User-Agent": USER_AGENT }
    });
    clearTimeout(timeout);

    if (commonsRes.ok) {
      const commonsData = await commonsRes.json();
      const commonsPages = commonsData.query?.pages || {};
      
      for (const key in commonsPages) {
        const cp = commonsPages[key];
        if (cp.imageinfo && cp.imageinfo.length > 0) {
          const info = cp.imageinfo[0];
          if (info.thumburl && !info.thumburl.toLowerCase().endsWith('.svg.png')) {
            if (!images.some(img => img.url === info.thumburl)) {
              images.push({ 
                url: info.thumburl, 
                title: cp.title.replace('File:', ''), 
                isMain: images.length === 0 
              });
            }
          }
        }
      }
    }
  } catch (err) {
    // Gracefully continue
  }

  res.json({ images });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Life App Server running on port ${PORT}`);
  });
}

startServer();
