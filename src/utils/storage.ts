import { Observation, Milestone, VenueSummary, EnclosureRecord } from '../types';

const STORAGE_KEY = 'life_app_observations_v2';
const ENCLOSURES_STORAGE_KEY = 'life_app_enclosures_v1';

export function loadObservations(): Observation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.removeItem('life_app_observations_v1');
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return recalculateLifers(parsed);
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
    const raw = localStorage.getItem(ENCLOSURES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
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
  const uniqueSpecies = new Set(observations.map(o => o.scientificName.toLowerCase()));
  const wildSpecies = new Set(observations.filter(o => o.wildStatus === 'wild').map(o => o.scientificName.toLowerCase()));
  const captiveSpecies = new Set(observations.filter(o => o.wildStatus === 'captive').map(o => o.scientificName.toLowerCase()));
  
  const classes = new Set(observations.map(o => o.taxonomy?.class).filter(Boolean));
  const orders = new Set(observations.map(o => o.taxonomy?.order).filter(Boolean));
  const families = new Set(observations.map(o => o.taxonomy?.family).filter(Boolean));
  const venues = new Set(observations.map(o => o.venueName.trim()).filter(Boolean));

  const total = uniqueSpecies.size;

  return [
    {
      id: 'm-first',
      title: 'First Life',
      subtitle: 'Log your very first species into the life list',
      category: 'count',
      progress: Math.min(total, 1),
      target: 1,
      completed: total >= 1,
      iconName: 'Sparkles'
    },
    {
      id: 'm-novice',
      title: 'Decad of Life',
      subtitle: 'Log 10 distinct species across any class',
      category: 'count',
      progress: Math.min(total, 10),
      target: 10,
      completed: total >= 10,
      iconName: 'Award'
    },
    {
      id: 'm-silver',
      title: 'Quarter Century List',
      subtitle: 'Reach 25 unique taxa on your life list',
      category: 'count',
      progress: Math.min(total, 25),
      target: 25,
      completed: total >= 25,
      iconName: 'Trophy'
    },
    {
      id: 'm-centurion',
      title: 'The Centurion',
      subtitle: 'Log 100 documented species',
      category: 'count',
      progress: Math.min(total, 100),
      target: 100,
      completed: total >= 100,
      iconName: 'Crown'
    },
    {
      id: 'm-wild-enthusiast',
      title: 'Field Explorer',
      subtitle: 'Log 10 free-ranging wild species in national parks or nature reserves',
      category: 'diversity',
      progress: Math.min(wildSpecies.size, 10),
      target: 10,
      completed: wildSpecies.size >= 10,
      iconName: 'Compass'
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
      id: 'm-globe-trotter',
      title: 'Sanctuary Trekker',
      subtitle: 'Record sightings across at least 5 distinct venues or reserves',
      category: 'venue',
      progress: Math.min(venues.size, 5),
      target: 5,
      completed: venues.size >= 5,
      iconName: 'MapPin'
    }
  ];
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
