import { Observation, Milestone, VenueSummary, EnclosureRecord, TripRecord, Coordinates } from '../types';

const STORAGE_KEY = 'life_app_observations_v3';
const ENCLOSURES_STORAGE_KEY = 'life_app_enclosures_v2';
const TRIPS_STORAGE_KEY = 'life_app_trips_v1';
const ACTIVE_TRIP_KEY = 'life_app_active_trip_v1';

export function loadTrips(): TripRecord[] {
  try {
    const raw = localStorage.getItem(TRIPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading trips from localStorage:', e);
    return [];
  }
}

export function saveTrips(trips: TripRecord[]): void {
  try {
    localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
  } catch (e) {
    console.error('Error saving trips:', e);
  }
}

export function loadActiveTrip(): TripRecord | null {
  try {
    const raw = localStorage.getItem(ACTIVE_TRIP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading active trip:', e);
    return null;
  }
}

export function saveActiveTrip(trip: TripRecord | null): void {
  try {
    if (!trip) {
      localStorage.removeItem(ACTIVE_TRIP_KEY);
    } else {
      localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(trip));
    }
  } catch (e) {
    console.error('Error saving active trip:', e);
  }
}

/**
 * Calculates the central point (centroid) of multiple GPS coordinates
 */
export function computeEnclosureCentroid(coords: (Coordinates | undefined | null)[]): Coordinates | undefined {
  const valid = coords.filter((c): c is Coordinates => Boolean(c && typeof c.latitude === 'number' && typeof c.longitude === 'number' && !isNaN(c.latitude) && !isNaN(c.longitude)));
  if (valid.length === 0) return undefined;
  if (valid.length === 1) return valid[0];

  let sumLat = 0;
  let sumLng = 0;
  let sumAccuracy = 0;
  let accuracyCount = 0;
  let latestCapture = 0;

  for (const c of valid) {
    sumLat += c.latitude;
    sumLng += c.longitude;
    if (c.accuracy) {
      sumAccuracy += c.accuracy;
      accuracyCount++;
    }
    if (c.capturedAt && c.capturedAt > latestCapture) {
      latestCapture = c.capturedAt;
    }
  }

  return {
    latitude: sumLat / valid.length,
    longitude: sumLng / valid.length,
    accuracy: accuracyCount > 0 ? Math.round(sumAccuracy / accuracyCount) : undefined,
    capturedAt: latestCapture || Date.now()
  };
}

/**
 * Deduplicates any duplicate observation entries (e.g. from identical batch submissions)
 */
export function deduplicateObservations(observations: Observation[]): Observation[] {
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  const uniqueObs: Observation[] = [];

  for (const obs of observations) {
    if (!obs || !obs.scientificName) continue;
    if (seenIds.has(obs.id)) continue;

    // Content signature: species + venue + date + exhibit
    const contentKey = `${obs.scientificName.trim().toLowerCase()}_${(obs.venueName || '').trim().toLowerCase()}_${obs.date}_${(obs.exhibitOrHabitat || obs.enclosureName || '').trim().toLowerCase()}_${obs.time?.slice(0, 5) || ''}`;

    if (seenContent.has(contentKey)) {
      continue;
    }

    seenIds.add(obs.id);
    seenContent.add(contentKey);
    uniqueObs.push(obs);
  }

  return recalculateLifers(uniqueObs);
}

export function loadObservations(): Observation[] {
  try {
    // Purge legacy storage versions containing sample dummy data
    localStorage.removeItem('life_app_observations_v1');
    
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check v2 and migrate if clean
      const v2 = localStorage.getItem('life_app_observations_v2');
      if (v2) {
        raw = v2;
      }
    }

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any dummy data for Singapore Zoo or Monterey Bay Aquarium
      const cleaned = parsed.filter((obs: Observation) => {
        const venue = (obs.venueName || '').toLowerCase();
        return !venue.includes('singapore zoo') && !venue.includes('monterey bay');
      });
      return deduplicateObservations(cleaned);
    }
    return [];
  } catch (e) {
    console.error('Error loading observations from localStorage:', e);
    return [];
  }
}

export function saveObservations(obs: Observation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obs));
  } catch (e) {
    console.error('Error saving observations:', e);
  }
}

export function loadEnclosures(): EnclosureRecord[] {
  try {
    let raw = localStorage.getItem(ENCLOSURES_STORAGE_KEY);
    if (!raw) {
      const v1 = localStorage.getItem('life_app_enclosures_v1');
      if (v1) {
        raw = v1;
      }
    }

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any dummy enclosures for Singapore Zoo or Monterey Bay Aquarium
      const cleaned = parsed.filter((enc: EnclosureRecord) => {
        const venue = (enc.venueName || '').toLowerCase();
        return !venue.includes('singapore') && !venue.includes('monterey');
      });
      return cleaned;
    }
    return [];
  } catch (e) {
    console.error('Error loading enclosures from localStorage:', e);
    return [];
  }
}

export function saveEnclosures(enclosures: EnclosureRecord[]): void {
  try {
    localStorage.setItem(ENCLOSURES_STORAGE_KEY, JSON.stringify(enclosures));
  } catch (e) {
    console.error('Error saving enclosures:', e);
  }
}

/**
 * Chronologically flags the first sighting of each unique taxon as isLifer: true
 */
export function recalculateLifers(observations: Observation[]): Observation[] {
  // Sort copy chronologically
  const sorted = [...observations].sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return (a.time || '00:00').localeCompare(b.time || '00:00');
  });

  const seenTaxa = new Set<string>();
  const liferObsIds = new Set<string>();

  for (const obs of sorted) {
    const key = obs.scientificName.trim().toLowerCase();
    if (!seenTaxa.has(key)) {
      seenTaxa.add(key);
      liferObsIds.add(obs.id);
    }
  }

  return observations.map(o => ({
    ...o,
    isLifer: liferObsIds.has(o.id)
  }));
}

export function computeVenues(observations: Observation[], enclosures: EnclosureRecord[] = []): VenueSummary[] {
  const map = new Map<string, {
    venueName: string;
    venueType: any;
    wildStatus: any;
    count: number;
    species: Set<string>;
    dates: string[];
    enclosureCount: number;
    signSpeciesCount: Set<string>;
    unseenSpeciesCount: Set<string>;
    coordinates?: { latitude: number; longitude: number };
  }>();

  // Process observations
  for (const obs of observations) {
    const name = obs.venueName.trim();
    if (!name) continue;
    if (!map.has(name)) {
      map.set(name, {
        venueName: name,
        venueType: obs.venueType,
        wildStatus: obs.wildStatus,
        count: 0,
        species: new Set<string>(),
        dates: [],
        enclosureCount: 0,
        signSpeciesCount: new Set<string>(),
        unseenSpeciesCount: new Set<string>(),
        coordinates: obs.coordinates
      });
    }
    const item = map.get(name)!;
    item.count += 1;
    item.species.add(obs.scientificName.toLowerCase());
    if (obs.date) item.dates.push(obs.date);
    if (!item.coordinates && obs.coordinates) {
      item.coordinates = obs.coordinates;
    }
  }

  // Process enclosures
  for (const enc of enclosures) {
    const name = enc.venueName.trim();
    if (!name) continue;
    if (!map.has(name)) {
      map.set(name, {
        venueName: name,
        venueType: 'zoo',
        wildStatus: 'captive',
        count: 0,
        species: new Set<string>(),
        dates: [],
        enclosureCount: 0,
        signSpeciesCount: new Set<string>(),
        unseenSpeciesCount: new Set<string>(),
        coordinates: enc.coordinates
      });
    }
    const item = map.get(name)!;
    item.enclosureCount += 1;
    if (enc.date) item.dates.push(enc.date);
    if (!item.coordinates && enc.coordinates) {
      item.coordinates = enc.coordinates;
    }

    for (const sp of enc.speciesList) {
      const spKey = sp.scientificName.toLowerCase();
      item.signSpeciesCount.add(spKey);
      if (!sp.isSeen) {
        item.unseenSpeciesCount.add(spKey);
      }
    }
  }

  return Array.from(map.values()).map(v => {
    v.dates.sort();
    return {
      venueName: v.venueName,
      venueType: v.venueType,
      wildStatus: v.wildStatus,
      observationCount: v.count,
      speciesCount: v.species.size,
      totalSignSpeciesCount: v.signSpeciesCount.size,
      unseenSpeciesCount: v.unseenSpeciesCount.size,
      enclosureCount: v.enclosureCount,
      firstVisited: v.dates[0] || 'Unknown',
      lastVisited: v.dates[v.dates.length - 1] || 'Unknown',
      coordinates: v.coordinates
    };
  }).sort((a, b) => (b.observationCount + (b.totalSignSpeciesCount || 0)) - (a.observationCount + (a.totalSignSpeciesCount || 0)));
}

export function computeMilestones(observations: Observation[]): Milestone[] {
  // Sets for distinct taxa
  const uniqueSpecies = new Set(observations.map(o => o.scientificName.trim().toLowerCase()).filter(Boolean));
  const wildSpecies = new Set(observations.filter(o => o.wildStatus === 'wild').map(o => o.scientificName.trim().toLowerCase()).filter(Boolean));
  const captiveSpecies = new Set(observations.filter(o => o.wildStatus === 'captive').map(o => o.scientificName.trim().toLowerCase()).filter(Boolean));
  
  const classes = new Set(observations.map(o => o.taxonomy?.class?.trim().toLowerCase()).filter(Boolean));
  const orders = new Set(observations.map(o => o.taxonomy?.order?.trim().toLowerCase()).filter(Boolean));
  const families = new Set(observations.map(o => o.taxonomy?.family?.trim().toLowerCase()).filter(Boolean));
  const genera = new Set(observations.map(o => o.taxonomy?.genus?.trim().toLowerCase() || o.scientificName.trim().split(' ')[0].toLowerCase()).filter(Boolean));
  const venues = new Set(observations.map(o => o.venueName?.trim().toLowerCase()).filter(Boolean));

  // Field documentation sets
  const photoSpecies = new Set(observations.filter(o => Boolean(o.photoUrl)).map(o => o.scientificName.trim().toLowerCase()).filter(Boolean));
  const gpsObservations = observations.filter(o => Boolean(o.coordinates?.latitude && o.coordinates?.longitude));
  const signObservations = observations.filter(o => Boolean(o.isFromSign || o.signPhotoUrl));
  const notesObservations = observations.filter(o => Boolean(o.notes && o.notes.trim().length >= 4));
  const parkVenues = new Set(observations.filter(o => o.venueType === 'nature_reserve' || o.venueType === 'national_park').map(o => o.venueName.trim().toLowerCase()));
  const zooVenues = new Set(observations.filter(o => o.venueType === 'zoo' || o.venueType === 'safari_park').map(o => o.venueName.trim().toLowerCase()));
  const aquariumVenues = new Set(observations.filter(o => o.venueType === 'aquarium').map(o => o.venueName.trim().toLowerCase()));

  // Guilds & Class-specific species sets
  const mammalSpecies = new Set(observations.filter(o => o.taxonomy?.class?.trim().toLowerCase() === 'mammalia').map(o => o.scientificName.trim().toLowerCase()));
  const birdSpecies = new Set(observations.filter(o => o.taxonomy?.class?.trim().toLowerCase() === 'aves').map(o => o.scientificName.trim().toLowerCase()));
  const reptileSpecies = new Set(observations.filter(o => o.taxonomy?.class?.trim().toLowerCase() === 'reptilia').map(o => o.scientificName.trim().toLowerCase()));
  const amphibianSpecies = new Set(observations.filter(o => o.taxonomy?.class?.trim().toLowerCase() === 'amphibia').map(o => o.scientificName.trim().toLowerCase()));
  
  const fishClasses = ['actinopterygii', 'elasmobranchii', 'chondrichthyes', 'sarcopterygii', 'myxini', 'hyperotreti', 'petromyzonti', 'holocephali'];
  const fishSpecies = new Set(observations.filter(o => fishClasses.includes(o.taxonomy?.class?.trim().toLowerCase() || '')).map(o => o.scientificName.trim().toLowerCase()));

  const invertClasses = ['insecta', 'arachnida', 'malacostraca', 'gastropoda', 'bivalvia', 'cephalopoda', 'anthozoa', 'clitellata', 'diplopoda', 'chilopoda', 'echinoidea', 'asteroidea'];
  const invertSpecies = new Set(observations.filter(o => 
    invertClasses.includes(o.taxonomy?.class?.trim().toLowerCase() || '') || 
    (o.taxonomy?.phylum && o.taxonomy.phylum.trim().toLowerCase() !== 'chordata')
  ).map(o => o.scientificName.trim().toLowerCase()));

  // Specific Order Guilds
  const carnivoraSpecies = new Set(observations.filter(o => o.taxonomy?.order?.trim().toLowerCase() === 'carnivora').map(o => o.scientificName.trim().toLowerCase()));
  const primateSpecies = new Set(observations.filter(o => o.taxonomy?.order?.trim().toLowerCase() === 'primates').map(o => o.scientificName.trim().toLowerCase()));
  const raptorOrders = ['accipitriformes', 'falconiformes', 'strigiformes', 'cathartiformes'];
  const raptorSpecies = new Set(observations.filter(o => raptorOrders.includes(o.taxonomy?.order?.trim().toLowerCase() || '')).map(o => o.scientificName.trim().toLowerCase()));
  const ungulateOrders = ['artiodactyla', 'perissodactyla', 'cetartiodactyla'];
  const ungulateSpecies = new Set(observations.filter(o => ungulateOrders.includes(o.taxonomy?.order?.trim().toLowerCase() || '')).map(o => o.scientificName.trim().toLowerCase()));
  const turtleSpecies = new Set(observations.filter(o => o.taxonomy?.order?.trim().toLowerCase() === 'testudines').map(o => o.scientificName.trim().toLowerCase()));
  const sharkOrders = ['carcharhiniformes', 'lamniformes', 'orectolobiformes', 'myliobatiformes', 'rhinopristiformes', 'torpediniformes', 'squaliformes', 'hexanchiformes', 'pristiophoriformes', 'squatiniformes', 'heterodontiformes'];
  const sharkSpecies = new Set(observations.filter(o => 
    o.taxonomy?.class?.trim().toLowerCase() === 'elasmobranchii' || 
    sharkOrders.includes(o.taxonomy?.order?.trim().toLowerCase() || '')
  ).map(o => o.scientificName.trim().toLowerCase()));
  const parrotSpecies = new Set(observations.filter(o => o.taxonomy?.order?.trim().toLowerCase() === 'psittaciformes').map(o => o.scientificName.trim().toLowerCase()));
  const frogSpecies = new Set(observations.filter(o => o.taxonomy?.order?.trim().toLowerCase() === 'anura').map(o => o.scientificName.trim().toLowerCase()));
  const squamateSpecies = new Set(observations.filter(o => o.taxonomy?.order?.trim().toLowerCase() === 'squamata').map(o => o.scientificName.trim().toLowerCase()));
  const crocodilianSpecies = new Set(observations.filter(o => o.taxonomy?.order?.trim().toLowerCase() === 'crocodylia').map(o => o.scientificName.trim().toLowerCase()));
  const rodentSpecies = new Set(observations.filter(o => o.taxonomy?.order?.trim().toLowerCase() === 'rodentia').map(o => o.scientificName.trim().toLowerCase()));
  const marsupialOrders = ['diprotodontia', 'didelphimorphia', 'dasyuromorphia', 'peramelemorphia', 'notoryctemorphia'];
  const marsupialSpecies = new Set(observations.filter(o => marsupialOrders.includes(o.taxonomy?.order?.trim().toLowerCase() || '')).map(o => o.scientificName.trim().toLowerCase()));

  const total = uniqueSpecies.size;

  const milestoneList: Milestone[] = [
    // -------------------------------------------------------------
    // 1. LIFE LIST SCALE & TOTAL SPECIES (10 Milestones)
    // -------------------------------------------------------------
    {
      id: 'm-first',
      title: 'First Life',
      subtitle: 'Log your very first species into your permanent life list',
      category: 'count',
      progress: Math.min(total, 1),
      target: 1,
      completed: total >= 1,
      iconName: 'Sparkles'
    },
    {
      id: 'm-decad',
      title: 'Decad of Life',
      subtitle: 'Document 10 distinct species across any class or habitat',
      category: 'count',
      progress: Math.min(total, 10),
      target: 10,
      completed: total >= 10,
      iconName: 'Award'
    },
    {
      id: 'm-silver',
      title: 'Quarter Century List',
      subtitle: 'Reach 25 unique taxa on your master life ledger',
      category: 'count',
      progress: Math.min(total, 25),
      target: 25,
      completed: total >= 25,
      iconName: 'Trophy'
    },
    {
      id: 'm-50',
      title: 'Half-Century Catalog',
      subtitle: 'Achieve 50 verified species in your life database',
      category: 'count',
      progress: Math.min(total, 50),
      target: 50,
      completed: total >= 50,
      iconName: 'Award'
    },
    {
      id: 'm-75',
      title: 'Biodiversity Tracker',
      subtitle: 'Log 75 distinct species observed across the globe',
      category: 'count',
      progress: Math.min(total, 75),
      target: 75,
      completed: total >= 75,
      iconName: 'Flame'
    },
    {
      id: 'm-centurion',
      title: 'The Centurion',
      subtitle: 'Surpass 100 documented species in your lifetime list',
      category: 'count',
      progress: Math.min(total, 100),
      target: 100,
      completed: total >= 100,
      iconName: 'Crown'
    },
    {
      id: 'm-150',
      title: 'Ecosystem Observer',
      subtitle: 'Reach 150 species documented across terrestrial and aquatic biomes',
      category: 'count',
      progress: Math.min(total, 150),
      target: 150,
      completed: total >= 150,
      iconName: 'Trees'
    },
    {
      id: 'm-200',
      title: 'Double Centurion',
      subtitle: 'Document 200 distinct species on your naturalist register',
      category: 'count',
      progress: Math.min(total, 200),
      target: 200,
      completed: total >= 200,
      iconName: 'Crown'
    },
    {
      id: 'm-300',
      title: 'Master Naturalist',
      subtitle: 'Reach an extraordinary milestone of 300 documented species',
      category: 'count',
      progress: Math.min(total, 300),
      target: 300,
      completed: total >= 300,
      iconName: 'Trophy'
    },
    {
      id: 'm-500',
      title: 'Grand Life Lister',
      subtitle: 'Attain 500 species in your worldwide zoological record',
      category: 'count',
      progress: Math.min(total, 500),
      target: 500,
      completed: total >= 500,
      iconName: 'Globe'
    },

    // -------------------------------------------------------------
    // 2. WILD EXPEDITIONS & FREE-RANGING (8 Milestones)
    // -------------------------------------------------------------
    {
      id: 'm-wild-first',
      title: 'Wild Spark',
      subtitle: 'Log your first free-ranging wild species in nature',
      category: 'diversity',
      progress: Math.min(wildSpecies.size, 1),
      target: 1,
      completed: wildSpecies.size >= 1,
      iconName: 'Compass'
    },
    {
      id: 'm-wild-trail',
      title: 'Trail Tracker',
      subtitle: 'Record 5 free-ranging wild species in natural habitats',
      category: 'diversity',
      progress: Math.min(wildSpecies.size, 5),
      target: 5,
      completed: wildSpecies.size >= 5,
      iconName: 'Navigation'
    },
    {
      id: 'm-wild-enthusiast',
      title: 'Field Explorer',
      subtitle: 'Log 10 free-ranging wild species in national parks or reserves',
      category: 'diversity',
      progress: Math.min(wildSpecies.size, 10),
      target: 10,
      completed: wildSpecies.size >= 10,
      iconName: 'Compass'
    },
    {
      id: 'm-wild-scout',
      title: 'Wilderness Scout',
      subtitle: 'Identify and log 25 wild animal species in native environments',
      category: 'diversity',
      progress: Math.min(wildSpecies.size, 25),
      target: 25,
      completed: wildSpecies.size >= 25,
      iconName: 'Trees'
    },
    {
      id: 'm-wild-ranger',
      title: 'Wilderness Ranger',
      subtitle: 'Log 50 wild species across forests, wetlands, oceans, or grasslands',
      category: 'diversity',
      progress: Math.min(wildSpecies.size, 50),
      target: 50,
      completed: wildSpecies.size >= 50,
      iconName: 'ShieldCheck'
    },
    {
      id: 'm-wild-vanguard',
      title: 'Wild Vanguard',
      subtitle: 'Achieve 100 wild species sightings logged in free-living habitats',
      category: 'diversity',
      progress: Math.min(wildSpecies.size, 100),
      target: 100,
      completed: wildSpecies.size >= 100,
      iconName: 'Flame'
    },
    {
      id: 'm-wild-horizon',
      title: 'Untamed Horizon',
      subtitle: 'Document 200 free-ranging wild species in your field journals',
      category: 'diversity',
      progress: Math.min(wildSpecies.size, 200),
      target: 200,
      completed: wildSpecies.size >= 200,
      iconName: 'Globe'
    },
    {
      id: 'm-parks-explorer',
      title: 'Reserve Trekker',
      subtitle: 'Survey wildlife across at least 3 nature reserves or national parks',
      category: 'diversity',
      progress: Math.min(parkVenues.size, 3),
      target: 3,
      completed: parkVenues.size >= 3,
      iconName: 'Trees'
    },

    // -------------------------------------------------------------
    // 3. LIVING COLLECTIONS, ZOOS & SANCTUARIES (9 Milestones)
    // -------------------------------------------------------------
    {
      id: 'm-zoo-first',
      title: 'First Enclosure',
      subtitle: 'Record your first captive species in a zoological institution',
      category: 'venue',
      progress: Math.min(captiveSpecies.size, 1),
      target: 1,
      completed: captiveSpecies.size >= 1,
      iconName: 'Building2'
    },
    {
      id: 'm-zoo-patron',
      title: 'Zoo Zoologist',
      subtitle: 'Log 15 captive species in accredited zoological parks or aquariums',
      category: 'venue',
      progress: Math.min(captiveSpecies.size, 15),
      target: 15,
      completed: captiveSpecies.size >= 15,
      iconName: 'Building2'
    },
    {
      id: 'm-zoo-collections',
      title: 'Living Collections Scholar',
      subtitle: 'Document 50 species in zoological gardens and conservation centers',
      category: 'venue',
      progress: Math.min(captiveSpecies.size, 50),
      target: 50,
      completed: captiveSpecies.size >= 50,
      iconName: 'BookOpen'
    },
    {
      id: 'm-zoo-menagerie',
      title: 'Menagerie Chronicler',
      subtitle: 'Record 100 species in accredited living collections worldwide',
      category: 'venue',
      progress: Math.min(captiveSpecies.size, 100),
      target: 100,
      completed: captiveSpecies.size >= 100,
      iconName: 'Crown'
    },
    {
      id: 'm-zoo-archivist',
      title: 'Global Zoo Archivist',
      subtitle: 'Achieve 200 species cataloged in zoological institutions and bio-domes',
      category: 'venue',
      progress: Math.min(captiveSpecies.size, 200),
      target: 200,
      completed: captiveSpecies.size >= 200,
      iconName: 'Globe'
    },
    {
      id: 'm-globe-hopper',
      title: 'Sanctuary Hopper',
      subtitle: 'Record sightings across at least 3 distinct venues or reserves',
      category: 'venue',
      progress: Math.min(venues.size, 3),
      target: 3,
      completed: venues.size >= 3,
      iconName: 'MapPin'
    },
    {
      id: 'm-globe-trotter',
      title: 'Sanctuary Trekker',
      subtitle: 'Record sightings across at least 5 distinct venues or reserves',
      category: 'venue',
      progress: Math.min(venues.size, 5),
      target: 5,
      completed: venues.size >= 5,
      iconName: 'MapPin'
    },
    {
      id: 'm-venue-10',
      title: 'Global Field Biologist',
      subtitle: 'Conduct wildlife surveys across 10 distinct venues or sanctuaries',
      category: 'venue',
      progress: Math.min(venues.size, 10),
      target: 10,
      completed: venues.size >= 10,
      iconName: 'Globe'
    },
    {
      id: 'm-venue-20',
      title: 'World Odyssey',
      subtitle: 'Record observations across 20 distinct locations and institutions',
      category: 'venue',
      progress: Math.min(venues.size, 20),
      target: 20,
      completed: venues.size >= 20,
      iconName: 'Compass'
    },

    // -------------------------------------------------------------
    // 4. TAXONOMIC BREADTH: CLASSES, ORDERS, FAMILIES (11 Milestones)
    // -------------------------------------------------------------
    {
      id: 'm-class-3',
      title: 'Phylogenetic Triage',
      subtitle: 'Encounter species from at least 3 distinct taxonomic Classes',
      category: 'clade',
      progress: Math.min(classes.size, 3),
      target: 3,
      completed: classes.size >= 3,
      iconName: 'GitFork'
    },
    {
      id: 'm-clade-diversity',
      title: 'Phylogenetic Breadth',
      subtitle: 'Encounter species from at least 5 distinct taxonomic Classes (e.g. Mammalia, Aves, Reptilia, Amphibia, Elasmobranchii)',
      category: 'clade',
      progress: Math.min(classes.size, 5),
      target: 5,
      completed: classes.size >= 5,
      iconName: 'GitFork'
    },
    {
      id: 'm-class-8',
      title: 'Phylogenetic Mastery',
      subtitle: 'Document species across 8 distinct taxonomic Classes',
      category: 'clade',
      progress: Math.min(classes.size, 8),
      target: 8,
      completed: classes.size >= 8,
      iconName: 'Network'
    },
    {
      id: 'm-class-12',
      title: 'Tree of Life Pioneer',
      subtitle: 'Witness the breadth of life across 12 distinct taxonomic Classes',
      category: 'clade',
      progress: Math.min(classes.size, 12),
      target: 12,
      completed: classes.size >= 12,
      iconName: 'Trees'
    },
    {
      id: 'm-orders-5',
      title: 'Order Initiate',
      subtitle: 'Log species belonging to 5 distinct taxonomic Orders',
      category: 'clade',
      progress: Math.min(orders.size, 5),
      target: 5,
      completed: orders.size >= 5,
      iconName: 'Network'
    },
    {
      id: 'm-orders-15',
      title: 'Order Voyager',
      subtitle: 'Expand your life list to span 15 distinct taxonomic Orders',
      category: 'clade',
      progress: Math.min(orders.size, 15),
      target: 15,
      completed: orders.size >= 15,
      iconName: 'Network'
    },
    {
      id: 'm-orders-30',
      title: 'Order Specialist',
      subtitle: 'Master taxonomic diversity spanning 30 taxonomic Orders',
      category: 'clade',
      progress: Math.min(orders.size, 30),
      target: 30,
      completed: orders.size >= 30,
      iconName: 'Crown'
    },
    {
      id: 'm-family-depth',
      title: 'Taxonomic Explorer',
      subtitle: 'Document species across 10 distinct taxonomic Families',
      category: 'clade',
      progress: Math.min(families.size, 10),
      target: 10,
      completed: families.size >= 10,
      iconName: 'Network'
    },
    {
      id: 'm-families-25',
      title: 'Family Taxonomist',
      subtitle: 'Catalog species spanning 25 distinct biological Families',
      category: 'clade',
      progress: Math.min(families.size, 25),
      target: 25,
      completed: families.size >= 25,
      iconName: 'BookOpen'
    },
    {
      id: 'm-families-50',
      title: 'Family Virtuoso',
      subtitle: 'Document species spanning 50 unique biological Families',
      category: 'clade',
      progress: Math.min(families.size, 50),
      target: 50,
      completed: families.size >= 50,
      iconName: 'Crown'
    },
    {
      id: 'm-genera-25',
      title: 'Genus Cartographer',
      subtitle: 'Log species belonging to 25 distinct biological Genera',
      category: 'clade',
      progress: Math.min(genera.size, 25),
      target: 25,
      completed: genera.size >= 25,
      iconName: 'Layers'
    },

    // -------------------------------------------------------------
    // 5. SPECIALIST GUILDS & TAXONOMIC CLASSES (19 Milestones)
    // -------------------------------------------------------------
    {
      id: 'm-mammals-5',
      title: 'Mammal Tracker',
      subtitle: 'Identify and record 5 distinct Mammal species (Mammalia)',
      category: 'guilds',
      progress: Math.min(mammalSpecies.size, 5),
      target: 5,
      completed: mammalSpecies.size >= 5,
      iconName: 'Target'
    },
    {
      id: 'm-mammals-20',
      title: 'Mammalogist',
      subtitle: 'Document 20 distinct Mammal species on your life list',
      category: 'guilds',
      progress: Math.min(mammalSpecies.size, 20),
      target: 20,
      completed: mammalSpecies.size >= 20,
      iconName: 'Award'
    },
    {
      id: 'm-mammals-50',
      title: 'Master of Beasts',
      subtitle: 'Reach 50 distinct Mammal species documented in the wild or living collections',
      category: 'guilds',
      progress: Math.min(mammalSpecies.size, 50),
      target: 50,
      completed: mammalSpecies.size >= 50,
      iconName: 'Crown'
    },
    {
      id: 'm-birds-5',
      title: 'Fledgling Birder',
      subtitle: 'Log 5 distinct Avian species (Aves) into your bird list',
      category: 'guilds',
      progress: Math.min(birdSpecies.size, 5),
      target: 5,
      completed: birdSpecies.size >= 5,
      iconName: 'Bird'
    },
    {
      id: 'm-birds-25',
      title: 'Avian Watcher',
      subtitle: 'Document 25 distinct Bird species across songbirds, waterbirds, or raptors',
      category: 'guilds',
      progress: Math.min(birdSpecies.size, 25),
      target: 25,
      completed: birdSpecies.size >= 25,
      iconName: 'Bird'
    },
    {
      id: 'm-birds-50',
      title: 'Master Birder',
      subtitle: 'Catalog 50 bird species on your life list with precise taxonomy',
      category: 'guilds',
      progress: Math.min(birdSpecies.size, 50),
      target: 50,
      completed: birdSpecies.size >= 50,
      iconName: 'Feather'
    },
    {
      id: 'm-birds-100',
      title: 'Centurion Twitcher',
      subtitle: 'Reach 100 bird species recorded worldwide',
      category: 'guilds',
      progress: Math.min(birdSpecies.size, 100),
      target: 100,
      completed: birdSpecies.size >= 100,
      iconName: 'Crown'
    },
    {
      id: 'm-reptiles-5',
      title: 'Herpetology Novice',
      subtitle: 'Document 5 species of Reptiles (lizards, snakes, turtles, or crocodilians)',
      category: 'guilds',
      progress: Math.min(reptileSpecies.size, 5),
      target: 5,
      completed: reptileSpecies.size >= 5,
      iconName: 'ShieldCheck'
    },
    {
      id: 'm-reptiles-15',
      title: 'Scales & Shells',
      subtitle: 'Log 15 distinct Reptile species in your naturalist catalog',
      category: 'guilds',
      progress: Math.min(reptileSpecies.size, 15),
      target: 15,
      completed: reptileSpecies.size >= 15,
      iconName: 'Sparkles'
    },
    {
      id: 'm-amphibians-3',
      title: 'Pond Whisperer',
      subtitle: 'Encounter and log 3 distinct Amphibian species (frogs, toads, or salamanders)',
      category: 'guilds',
      progress: Math.min(amphibianSpecies.size, 3),
      target: 3,
      completed: amphibianSpecies.size >= 3,
      iconName: 'Sparkles'
    },
    {
      id: 'm-amphibians-10',
      title: 'Amphibian Guardian',
      subtitle: 'Log 10 distinct Amphibia species across wetlands and vivariums',
      category: 'guilds',
      progress: Math.min(amphibianSpecies.size, 10),
      target: 10,
      completed: amphibianSpecies.size >= 10,
      iconName: 'Heart'
    },
    {
      id: 'm-fish-5',
      title: 'Aquarist Sighting',
      subtitle: 'Log 5 distinct Fish species across reef, freshwater, or pelagic waters',
      category: 'guilds',
      progress: Math.min(fishSpecies.size, 5),
      target: 5,
      completed: fishSpecies.size >= 5,
      iconName: 'Fish'
    },
    {
      id: 'm-fish-20',
      title: 'Oceanic Explorer',
      subtitle: 'Catalog 20 fish species across marine and riverine habitats',
      category: 'guilds',
      progress: Math.min(fishSpecies.size, 20),
      target: 20,
      completed: fishSpecies.size >= 20,
      iconName: 'Fish'
    },
    {
      id: 'm-inverts-5',
      title: 'Spineless Wonders',
      subtitle: 'Log 5 Invertebrate species (insects, arachnids, molluscs, or corals)',
      category: 'guilds',
      progress: Math.min(invertSpecies.size, 5),
      target: 5,
      completed: invertSpecies.size >= 5,
      iconName: 'Bug'
    },
    {
      id: 'm-inverts-15',
      title: 'Micro-Fauna Naturalist',
      subtitle: 'Document 15 Invertebrate species showing global biodiversity',
      category: 'guilds',
      progress: Math.min(invertSpecies.size, 15),
      target: 15,
      completed: invertSpecies.size >= 15,
      iconName: 'Bug'
    },
    {
      id: 'm-carnivores-5',
      title: 'Apex Predators',
      subtitle: 'Log 5 species from Order Carnivora (felids, canids, ursids, pinnipeds)',
      category: 'guilds',
      progress: Math.min(carnivoraSpecies.size, 5),
      target: 5,
      completed: carnivoraSpecies.size >= 5,
      iconName: 'Flame'
    },
    {
      id: 'm-primates-5',
      title: 'Primate Kinship',
      subtitle: 'Record 5 species from Order Primates (lemurs, monkeys, or apes)',
      category: 'guilds',
      progress: Math.min(primateSpecies.size, 5),
      target: 5,
      completed: primateSpecies.size >= 5,
      iconName: 'Heart'
    },
    {
      id: 'm-raptors-5',
      title: 'Raptor Watch',
      subtitle: 'Spot and record 5 Birds of Prey (eagles, hawks, owls, or falcons)',
      category: 'guilds',
      progress: Math.min(raptorSpecies.size, 5),
      target: 5,
      completed: raptorSpecies.size >= 5,
      iconName: 'Bird'
    },
    {
      id: 'm-ungulates-10',
      title: 'Hoofed & Horned',
      subtitle: 'Log 10 Ungulate species (Artiodactyla / Perissodactyla)',
      category: 'guilds',
      progress: Math.min(ungulateSpecies.size, 10),
      target: 10,
      completed: ungulateSpecies.size >= 10,
      iconName: 'Target'
    },
    {
      id: 'm-turtles-3',
      title: 'Ancient Shells',
      subtitle: 'Document 3 species of Testudines (turtles, tortoises, and terrapins)',
      category: 'guilds',
      progress: Math.min(turtleSpecies.size, 3),
      target: 3,
      completed: turtleSpecies.size >= 3,
      iconName: 'ShieldCheck'
    },
    {
      id: 'm-sharks-3',
      title: 'Elasmobranch Chaser',
      subtitle: 'Log 3 species of Sharks, Rays, or Skates (Elasmobranchii)',
      category: 'guilds',
      progress: Math.min(sharkSpecies.size, 3),
      target: 3,
      completed: sharkSpecies.size >= 3,
      iconName: 'Fish'
    },
    {
      id: 'm-parrots-3',
      title: 'Psittacine Splendor',
      subtitle: 'Document 3 Parrot, Macaw, or Cockatoo species (Psittaciformes)',
      category: 'guilds',
      progress: Math.min(parrotSpecies.size, 3),
      target: 3,
      completed: parrotSpecies.size >= 3,
      iconName: 'Feather'
    },
    {
      id: 'm-crocs-2',
      title: 'Crocodylian Lineage',
      subtitle: 'Document 2 Crocodylian species (alligators, crocodiles, or caimans)',
      category: 'guilds',
      progress: Math.min(crocodilianSpecies.size, 2),
      target: 2,
      completed: crocodilianSpecies.size >= 2,
      iconName: 'ShieldCheck'
    },

    // -------------------------------------------------------------
    // 6. FIELD CRAFT, NOTES & DOCUMENTATION (8 Milestones)
    // -------------------------------------------------------------
    {
      id: 'm-photo-1',
      title: 'Visual Evidence',
      subtitle: 'Attach your first field photo to an observation in your life list',
      category: 'fieldcraft',
      progress: Math.min(photoSpecies.size, 1),
      target: 1,
      completed: photoSpecies.size >= 1,
      iconName: 'Camera'
    },
    {
      id: 'm-photo-10',
      title: 'Wildlife Photographer',
      subtitle: 'Attach photos to at least 10 unique species in your field ledger',
      category: 'fieldcraft',
      progress: Math.min(photoSpecies.size, 10),
      target: 10,
      completed: photoSpecies.size >= 10,
      iconName: 'Camera'
    },
    {
      id: 'm-photo-25',
      title: 'Visual Catalog',
      subtitle: 'Create a visual gallery of 25 photographed species',
      category: 'fieldcraft',
      progress: Math.min(photoSpecies.size, 25),
      target: 25,
      completed: photoSpecies.size >= 25,
      iconName: 'Camera'
    },
    {
      id: 'm-photo-50',
      title: 'Master Documentarian',
      subtitle: 'Build a comprehensive photo portfolio of 50 documented species',
      category: 'fieldcraft',
      progress: Math.min(photoSpecies.size, 50),
      target: 50,
      completed: photoSpecies.size >= 50,
      iconName: 'Trophy'
    },
    {
      id: 'm-gps-5',
      title: 'Geo-Tagged Sighting',
      subtitle: 'Record GPS coordinates for 5 distinct observation entries',
      category: 'fieldcraft',
      progress: Math.min(gpsObservations.length, 5),
      target: 5,
      completed: gpsObservations.length >= 5,
      iconName: 'MapPin'
    },
    {
      id: 'm-gps-25',
      title: 'Cartographic Surveyor',
      subtitle: 'Record accurate GPS coordinates on 25 observation entries',
      category: 'fieldcraft',
      progress: Math.min(gpsObservations.length, 25),
      target: 25,
      completed: gpsObservations.length >= 25,
      iconName: 'Navigation'
    },
    {
      id: 'm-signs-5',
      title: 'Sign Scanner',
      subtitle: 'Scan and import 5 species from zoo signs and exhibit plaques',
      category: 'fieldcraft',
      progress: Math.min(signObservations.length, 5),
      target: 5,
      completed: signObservations.length >= 5,
      iconName: 'Scan'
    },
    {
      id: 'm-notes-10',
      title: 'Field Chronicler',
      subtitle: 'Log 10 observations with detailed field notes or behavioral tags',
      category: 'fieldcraft',
      progress: Math.min(notesObservations.length, 10),
      target: 10,
      completed: notesObservations.length >= 10,
      iconName: 'Tag'
    }
  ];

  return milestoneList;
}

export function exportToCSV(observations: Observation[]): string {
  const headers = [
    'Observation ID',
    'Scientific Name',
    'Common Name',
    'Kingdom',
    'Phylum',
    'Class',
    'Order',
    'Family',
    'Genus',
    'Date',
    'Time',
    'Venue Name',
    'Venue Type',
    'Wild Status',
    'Exhibit / Habitat',
    'Individual Name / Tag',
    'Country',
    'Region',
    'Count',
    'Sex',
    'Life Stage',
    'Is Lifer',
    'Tags',
    'Notes'
  ];

  const escapeCSV = (str: string | undefined | null) => {
    if (!str) return '""';
    const clean = String(str).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = observations.map(o => [
    escapeCSV(o.id),
    escapeCSV(o.scientificName),
    escapeCSV(o.vernacularName),
    escapeCSV(o.taxonomy?.kingdom),
    escapeCSV(o.taxonomy?.phylum),
    escapeCSV(o.taxonomy?.class),
    escapeCSV(o.taxonomy?.order),
    escapeCSV(o.taxonomy?.family),
    escapeCSV(o.taxonomy?.genus),
    escapeCSV(o.date),
    escapeCSV(o.time || ''),
    escapeCSV(o.venueName),
    escapeCSV(o.venueType),
    escapeCSV(o.wildStatus),
    escapeCSV(o.exhibitOrHabitat || ''),
    escapeCSV(o.individualNameOrTag || ''),
    escapeCSV(o.country || ''),
    escapeCSV(o.region || ''),
    o.count || 1,
    escapeCSV(o.sex),
    escapeCSV(o.lifeStage),
    o.isLifer ? 'TRUE' : 'FALSE',
    escapeCSV((o.tags || []).join('; ')),
    escapeCSV(o.notes || '')
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}
