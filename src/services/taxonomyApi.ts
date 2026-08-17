import { Taxon } from '../types';
import { curatedTaxa } from '../data/curatedTaxa';
import { searchOfflineCatalogue } from './offlineCatalogue';

const COL_CACHE_KEY = 'col_offline_species_cache_v1';

function getColOfflineCache(): Taxon[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COL_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to read CoL offline cache:', e);
    return [];
  }
}

export function saveToColOfflineCache(taxa: Taxon[]) {
  if (typeof window === 'undefined' || !taxa || taxa.length === 0) return;
  try {
    const existing = getColOfflineCache();
    const map = new Map<string, Taxon>();
    for (const t of existing) map.set(t.scientificName.toLowerCase(), t);
    for (const t of taxa) {
      if (t && t.scientificName) {
        map.set(t.scientificName.toLowerCase(), {
          ...t,
          source: t.source || 'Catalogue of Life'
        });
      }
    }
    const updated = Array.from(map.values()).slice(0, 5000);
    localStorage.setItem(COL_CACHE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to update CoL offline cache:', e);
  }
}

export function createCustomTaxon(rawQuery: string): Taxon {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return {
      id: `col-offline-unknown-${Date.now().toString(36)}`,
      scientificName: 'Unspecified species',
      vernacularName: 'Unspecified species',
      rank: 'species',
      status: 'accepted',
      kingdom: 'Animalia',
      phylum: 'Chordata',
      class: 'Mammalia',
      order: '',
      family: '',
      genus: 'Unspecified',
      iconicGroup: 'Other',
      source: 'Catalogue of Life (Offline Engine)'
    };
  }

  const lower = trimmed.toLowerCase();
  const toTitleCase = (str: string) => str.replace(/\b\w/g, char => char.toUpperCase());
  const words = trimmed.split(/\s+/);
  const isBinomial = words.length >= 2 && /^[A-Z][a-z]+$/.test(words[0]) && /^[a-z]+$/.test(words[1]);

  let scientificName = trimmed;
  let vernacularName = trimmed;
  let genus = words[0] ? toTitleCase(words[0]) : 'Unspecified';

  if (isBinomial) {
    scientificName = `${toTitleCase(words[0])} ${words[1].toLowerCase()}`;
    vernacularName = `${toTitleCase(words[0])} ${words[1].toLowerCase()}`;
    genus = toTitleCase(words[0]);
  } else {
    vernacularName = toTitleCase(trimmed);
    scientificName = toTitleCase(trimmed);
  }

  let kingdom = 'Animalia';
  let phylum = 'Chordata';
  let className = 'Mammalia';
  let orderName = '';
  let familyName = '';
  let iconicGroup: Taxon['iconicGroup'] = 'Mammals';

  if (/owl|eagle|falcon|hawk|harrier|buzzard|vulture|condor|osprey|kestrel|kite|parrot|macaw|cockatoo|parakeet|lorikeet|lovebird|penguin|duck|goose|swan|teal|mallard|heron|egret|ibis|spoonbill|stork|crane|flamingo|pelican|cormorant|gannet|booby|frigatebird|albatross|petrel|puffin|auk|hummingbird|swift|kingfisher|bee-eater|hornbill|toucan|woodpecker|barbet|crow|raven|jay|magpie|paradise|bowerbird|lyrebird|finch|sparrow|warbler|thrush|robin|blackbird|bluebird|starling|myna|cardinal|tanager|bunting|grosbeak|weaver|waxbill|manakin|cotinga|quetzal|trogon|emu|ostrich|cassowary|rhea|kiwi|pheasant|peacock|peafowl|quail|partridge|grouse|turkey|pigeon|dove|rail|gallinule|coot|jacana|plover|sandpiper|curlew|gull|tern|skua|shoebill|secretarybird|bird/i.test(lower)) {
    className = 'Aves';
    iconicGroup = 'Birds';
    if (/owl/i.test(lower)) { orderName = 'Strigiformes'; familyName = 'Strigidae'; }
    else if (/eagle|hawk|harrier|buzzard|vulture|kite|osprey/i.test(lower)) { orderName = 'Accipitriformes'; familyName = 'Accipitridae'; }
    else if (/falcon|kestrel/i.test(lower)) { orderName = 'Falconiformes'; familyName = 'Falconidae'; }
    else if (/parrot|macaw|cockatoo|parakeet/i.test(lower)) { orderName = 'Psittaciformes'; familyName = 'Psittacidae'; }
    else if (/duck|goose|swan|teal|mallard/i.test(lower)) { orderName = 'Anseriformes'; familyName = 'Anatidae'; }
    else if (/penguin/i.test(lower)) { orderName = 'Sphenisciformes'; familyName = 'Spheniscidae'; }
  } else if (/lion|tiger|leopard|jaguar|cheetah|panther|cougar|puma|cat|serval|caracal|ocelot|lynx|bobcat|dog|wolf|coyote|jackal|dingo|fox|bear|panda|otter|badger|skunk|wolverine|marten|mink|ferret|mongoose|meerkat|civet|genet|hyena|seal|sea lion|walrus|whale|dolphin|porpoise|orca|narwhal|beluga|elephant|rhino|rhinoceros|hippo|hippopotamus|giraffe|okapi|zebra|horse|donkey|tapir|deer|elk|moose|caribou|reindeer|antelope|gazelle|impala|wildebeest|kudu|bison|buffalo|yak|ibex|goat|sheep|bighorn|mouflon|pig|boar|warthog|peccary|camel|llama|alpaca|vicuna|monkey|lemur|loris|bushbaby|ape|chimpanzee|bonobo|gorilla|orangutan|gibbon|baboon|mandrill|macaque|langur|colobus|tamarin|marmoset|capuchin|squirrel monkey|howler|spider monkey|bat|flying fox|pangolin|anteater|sloth|armadillo|rabbit|hare|pika|beaver|squirrel|chipmunk|marmot|prairie dog|gopher|rat|mouse|hamster|gerbil|vole|porcupine|capybara|guinea pig|chinchilla|mara|nutria|agouti|kangaroo|wallaby|koala|wombat|possum|opossum|tasmanian devil|quoll|numbat|platypus|echidna/i.test(lower)) {
    className = 'Mammalia';
    iconicGroup = 'Mammals';
    if (/cat|lion|tiger|leopard|jaguar|cheetah|panther|cougar|puma|serval|caracal|ocelot|lynx|bobcat/i.test(lower)) { orderName = 'Carnivora'; familyName = 'Felidae'; }
    else if (/dog|wolf|coyote|jackal|dingo|fox/i.test(lower)) { orderName = 'Carnivora'; familyName = 'Canidae'; }
    else if (/bear|panda/i.test(lower)) { orderName = 'Carnivora'; familyName = 'Ursidae'; }
    else if (/ape|chimpanzee|bonobo|gorilla|orangutan|human/i.test(lower)) { orderName = 'Primates'; familyName = 'Hominidae'; }
    else if (/monkey|baboon|mandrill|macaque|langur|colobus/i.test(lower)) { orderName = 'Primates'; familyName = 'Cercopithecidae'; }
    else if (/whale|dolphin|porpoise|orca/i.test(lower)) { orderName = 'Cetartiodactyla'; familyName = 'Delphinidae'; }
    else if (/elephant/i.test(lower)) { orderName = 'Proboscidea'; familyName = 'Elephantidae'; }
  } else if (/snake|python|boa|viper|rattlesnake|cobra|mamba|krait|adder|coral snake|garter|racer|rat snake|king snake|iguana|gecko|chameleon|monitor|komodo|lizard|dragon|skink|anole|tegu|gila|turtle|tortoise|terrapin|sea turtle|snapping turtle|slider|pond turtle|softshell|crocodile|alligator|caiman|gharial|tuatara/i.test(lower)) {
    className = 'Reptilia';
    iconicGroup = 'Reptiles';
    if (/snake|python|boa|viper|cobra/i.test(lower)) { orderName = 'Squamata'; familyName = 'Serpentes'; }
    else if (/lizard|iguana|gecko|chameleon|monitor/i.test(lower)) { orderName = 'Squamata'; familyName = 'Iguanidae'; }
    else if (/turtle|tortoise|terrapin/i.test(lower)) { orderName = 'Testudines'; familyName = 'Testudinidae'; }
    else if (/crocodile|alligator|caiman/i.test(lower)) { orderName = 'Crocodilia'; familyName = 'Crocodylidae'; }
  } else if (/frog|toad|salamander|newt|caecilian|axolotl|siren|mudpuppy|hellbender|poison dart|tree frog|bullfrog|spadefoot/i.test(lower)) {
    className = 'Amphibia';
    iconicGroup = 'Amphibians';
    if (/frog|toad|tree frog|bullfrog/i.test(lower)) { orderName = 'Anura'; familyName = 'Ranidae'; }
    else if (/salamander|newt|axolotl/i.test(lower)) { orderName = 'Caudata'; familyName = 'Salamandridae'; }
  } else if (/shark|ray|skate|sawfish|guitarfish|sturgeon|paddlefish|gar|bowfin|eel|moray|tarpon|bonefish|anchovy|herring|sardine|carp|goldfish|koi|minnow|catfish|piranha|pacu|tetra|salmon|trout|pike|cod|anglerfish|frogfish|clownfish|anemonefish|damselfish|tang|surgeonfish|angelfish|butterflyfish|wrasse|parrotfish|blenny|goby|barracuda|tuna|mackerel|swordfish|marlin|flounder|sole|halibut|seahorse|pipefish|lionfish|scorpionfish|sea bass|grouper|snapper|grunt|cichlid|discus|oscar|gourami|betta|guppy|molly|platy|swordtail|fish/i.test(lower)) {
    className = lower.includes('shark') || lower.includes('ray') || lower.includes('skate') || lower.includes('sawfish') ? 'Chondrichthyes' : 'Actinopterygii';
    iconicGroup = 'Fishes';
    orderName = className === 'Chondrichthyes' ? 'Carcharhiniformes' : 'Perciformes';
  } else if (/butterfly|moth|caterpillar|beetle|ladybug|firefly|ant|bee|wasp|hornet|fly|mosquito|dragonfly|damselfly|mantis|grasshopper|cricket|katydid|cicada|termite|spider|tarantula|scorpion|crab|hermit crab|lobster|crayfish|shrimp|krill|barnacle|octopus|squid|cuttlefish|nautilus|snail|slug|nudibranch|conch|clam|mussel|oyster|scallop|jellyfish|coral|anemone|starfish|sea star|sea urchin|sea cucumber|sponge|worm/i.test(lower)) {
    phylum = lower.includes('octopus') || lower.includes('squid') || lower.includes('snail') || lower.includes('clam') ? 'Mollusca' : (lower.includes('crab') || lower.includes('lobster') || lower.includes('spider') || lower.includes('beetle') ? 'Arthropoda' : 'Invertebrata');
    className = lower.includes('butterfly') || lower.includes('beetle') || lower.includes('ant') ? 'Insecta' : 'Invertebrata';
    iconicGroup = 'Invertebrates';
  } else if (/tree|pine|oak|maple|birch|willow|palm|fern|moss|cactus|succulent|orchid|rose|lily|tulip|sunflower|lotus|bamboo|cypress|redwood|sequoia|cedar|spruce|fir|mushroom|toadstool|flower|plant/i.test(lower)) {
    kingdom = lower.includes('mushroom') || lower.includes('toadstool') ? 'Fungi' : 'Plantae';
    phylum = kingdom === 'Plantae' ? 'Tracheophyta' : 'Ascomycota';
    className = kingdom === 'Plantae' ? 'Magnoliopsida' : 'Agaricomycetes';
    iconicGroup = 'Plants';
  }

  const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const taxon: Taxon = {
    id: `col-offline-${slug}-${Date.now().toString(36)}`,
    scientificName,
    vernacularName,
    rank: 'species',
    status: 'accepted',
    kingdom,
    phylum,
    class: className,
    order: orderName,
    family: familyName,
    genus,
    iconicGroup,
    source: 'Catalogue of Life (Offline Engine)'
  };

  saveToColOfflineCache([taxon]);
  return taxon;
}

export async function searchTaxonomy(query: string): Promise<Taxon[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const q = trimmed.toLowerCase();
  const cachedCol = getColOfflineCache();
  const allOfflineTaxa = [...curatedTaxa, ...cachedCol];

  const searchLocal = () => {
    const seen = new Set<string>();
    const matched: Taxon[] = [];

    for (const t of allOfflineTaxa) {
      if (!t || !t.scientificName) continue;
      const key = t.scientificName.toLowerCase();
      if (seen.has(key)) continue;

      if (
        t.scientificName.toLowerCase().includes(q) ||
        t.vernacularName.toLowerCase().includes(q) ||
        t.family?.toLowerCase().includes(q) ||
        t.order?.toLowerCase().includes(q) ||
        t.genus?.toLowerCase().includes(q) ||
        (t.allVernaculars || []).some(v => v.toLowerCase().includes(q))
      ) {
        seen.add(key);
        matched.push(t);
      }
    }
    return matched;
  };

  let results: Taxon[] = [];

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    // The complete CoL index is shipped as compressed static shards and precached by the SW.
    // Search it first, then merge the existing curated/common-name cache for richer results.
    const fullOffline = await searchOfflineCatalogue(trimmed);
    results = [...fullOffline, ...searchLocal()];
  } else {
    try {
      const res = await fetch(`/api/taxonomy/search?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.results) && data.results.length > 0) {
          results = data.results;
          saveToColOfflineCache(results);
        }
      }
    } catch (e) {
      console.warn('Network taxonomy search failed, falling back to offline CoL database:', e);
      results = await searchOfflineCatalogue(trimmed);
    }

    if (results.length === 0) {
      const fullOffline = await searchOfflineCatalogue(trimmed);
      results = [...fullOffline, ...searchLocal()];
    }
  }

  const seen = new Set<string>();
  results = results.filter(t => {
    const key = t.scientificName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);

  const exactMatch = results.some(
    t => t.vernacularName.toLowerCase() === q || t.scientificName.toLowerCase() === q
  );

  if (!exactMatch) {
    const customTaxon = createCustomTaxon(trimmed);
    results = [...results, customTaxon];
  }

  return results;
}
