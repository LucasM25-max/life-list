export type WildStatus = 'captive' | 'wild';

export type VenueType = 'zoo' | 'aquarium' | 'safari_park' | 'wildlife_sanctuary' | 'nature_reserve' | 'national_park' | 'wilderness' | 'urban_wild' | 'pelagic' | 'other';

export type IUCNStatus = 'NE' | 'DD' | 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX';

export interface Taxon {
  id: string;
  colId?: string;
  scientificName: string;
  vernacularName: string;
  authorship?: string;
  rank: 'species' | 'subspecies' | 'genus' | 'family';
  status?: string;
  kingdom: string;
  phylum: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  iucnCategory?: IUCNStatus;
  allVernaculars?: string[];
  iconicGroup?: 'Mammals' | 'Birds' | 'Reptiles' | 'Amphibians' | 'Fishes' | 'Invertebrates' | 'Plants' | 'Other';
  source?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt?: number;
}

export interface TripRecord {
  id: string;
  userId?: string;
  venueName: string;
  venueType: VenueType;
  wildStatus: WildStatus;
  startTime: number;
  startDate: string; // YYYY-MM-DD
  endTime?: number;
  endDate?: string;
  status: 'active' | 'completed';
  notes?: string;
  observationIds?: string[];
  enclosureIds?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface EnclosureSpecies {
  id: string;
  scientificName: string;
  vernacularName: string;
  alternateNames?: string[];
  taxonomy: {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
  };
  iucnCategory?: IUCNStatus;
  isSeen: boolean;
  observationId?: string;
  notes?: string;
  photoUrl?: string;
  seenAt?: string;
}

export interface EnclosureRecord {
  id: string;
  userId?: string;
  tripId?: string;
  venueName: string;
  enclosureName: string;
  timestamp: number; // Used for chronological walkthrough
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  coordinates?: Coordinates;
  signPhotoUrl?: string;
  notes?: string;
  speciesList: EnclosureSpecies[];
  createdAt: number;
  updatedAt: number;
}

export interface Observation {
  id: string;
  userId?: string;
  tripId?: string;
  taxonId: string;
  scientificName: string;
  vernacularName: string;
  authorship?: string;
  taxonomy: {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
  };
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  venueName: string; // e.g. "San Diego Zoo Safari Park" or "Serengeti National Park"
  venueType: VenueType;
  wildStatus: WildStatus;
  exhibitOrHabitat?: string; // e.g. "African Woods Aviary" or "Riparian Marsh"
  enclosureId?: string;
  enclosureName?: string;
  coordinates?: Coordinates;
  signPhotoUrl?: string;
  isFromSign?: boolean;
  individualNameOrTag?: string; // e.g. "Fiona", "Old Scarface", "Banding #912"
  country?: string;
  region?: string;
  notes?: string;
  tags: string[];
  photoUrl?: string;
  count: number;
  sex: 'unspecified' | 'male' | 'female' | 'mixed_group';
  lifeStage: 'adult' | 'juvenile' | 'subadult' | 'chick_cub_larva' | 'various';
  isLifer?: boolean; // Flagged if this was the very first sighting of this species
  createdAt: number;
  updatedAt: number;
}

export interface LifeListFilter {
  search: string;
  classFilter: string;
  orderFilter: string;
  familyFilter: string;
  wildStatus: 'all' | 'wild' | 'captive';
  venue: string;
  year: string;
  tag: string;
  sortBy: 'date_desc' | 'date_asc' | 'taxonomic' | 'scientific_asc' | 'vernacular_asc';
  viewMode: 'compact_table' | 'ledger_cards' | 'taxonomy_tree' | 'venues_matrix';
}

export interface Milestone {
  id: string;
  title: string;
  subtitle: string;
  category: 'count' | 'clade' | 'venue' | 'diversity' | 'guilds' | 'fieldcraft';
  progress: number;
  target: number;
  completed: boolean;
  achievedDate?: string;
  iconName: string;
}

export interface VenueSummary {
  venueName: string;
  venueType: VenueType;
  wildStatus: WildStatus;
  observationCount: number;
  speciesCount: number;
  totalSignSpeciesCount?: number;
  unseenSpeciesCount?: number;
  enclosureCount?: number;
  lastVisited: string;
  firstVisited: string;
  coordinates?: Coordinates;
}
