import { Taxon } from '../types';
import { curatedTaxa } from '../data/curatedTaxa';

export function createCustomTaxon(rawQuery: string): Taxon {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return {
      id: `custom-unknown-${Date.now().toString(36)}`,
      scientificName: 'Unspecified species',
      vernacularName: 'Unspecified species',
      rank: 'species',
      kingdom: 'Animalia',
      phylum: 'Chordata',
      class: 'Mammalia',
      order: '',
      family: '',
      genus: 'Unspecified',
      iconicGroup: 'Other',
      source: 'Custom Entry'
    };
  }

  const lower = trimmed.toLowerCase();

  const toTitleCase = (str: string) => 
    str.replace(/\b\w/g, char => char.toUpperCase());

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

  // Smart Keyword Classifier
  if (/owl|eagle|falcon|hawk|harrier|buzzard|vulture|condor|osprey|kestrel|kite|parrot|macaw|cockatoo|parakeet|lorikeet|lovebird|penguin|duck|goose|swan|teal|mallard|heron|egret|ibis|spoonbill|stork|crane|flamingo|pelican|cormorant|gannet|booby|frigatebird|albatross|petrel|puffin|auk|hummingbird|swift|kingfisher|bee-eater|hornbill|toucan|woodpecker|barbet|crow|raven|jay|magpie|paradise|bowerbird|lyrebird|finch|sparrow|warbler|thrush|robin|blackbird|bluebird|starling|myna|cardinal|tanager|bunting|grosbeak|weaver|waxbill|manakin|cotinga|quetzal|trogon|emu|ostrich|cassowary|rhea|kiwi|pheasant|peacock|peafowl|quail|partridge|grouse|turkey|pigeon|dove|rail|gallinule|coot|jacana|plover|sandpiper|curlew|gull|tern|skua|shoebill|secretarybird|bird/i.test(lower)) {
    className = 'Aves';
    iconicGroup = 'Birds';
  } else if (/lion|tiger|leopard|jaguar|cheetah|panther|cougar|puma|cat|serval|caracal|ocelot|lynx|bobcat|dog|wolf|coyote|jackal|dingo|fox|bear|panda|otter|badger|skunk|wolverine|marten|mink|ferret|mongoose|meerkat|civet|genet|hyena|seal|sea lion|walrus|whale|dolphin|porpoise|orca|narwhal|beluga|elephant|rhino|rhinoceros|hippo|hippopotamus|giraffe|okapi|zebra|horse|donkey|tapir|deer|elk|moose|caribou|reindeer|antelope|gazelle|impala|wildebeest|kudu|bison|buffalo|yak|ibex|goat|sheep|bighorn|mouflon|pig|boar|warthog|peccary|camel|llama|alpaca|vicuna|monkey|lemur|loris|bushbaby|ape|chimpanzee|bonobo|gorilla|orangutan|gibbon|baboon|mandrill|macaque|langur|colobus|tamarin|marmoset|capuchin|squirrel monkey|howler|spider monkey|bat|flying fox|pangolin|anteater|sloth|armadillo|rabbit|hare|pika|beaver|squirrel|chipmunk|marmot|prairie dog|gopher|rat|mouse|hamster|gerbil|vole|porcupine|capybara|guinea pig|chinchilla|mara|nutria|agouti|kangaroo|wallaby|koala|wombat|possum|opossum|tasmanian devil|quoll|numbat|platypus|echidna/i.test(lower)) {
    className = 'Mammalia';
    iconicGroup = 'Mammals';
  } else if (/snake|python|boa|viper|rattlesnake|cobra|mamba|krait|adder|coral snake|garter|racer|rat snake|king snake|iguana|gecko|chameleon|monitor|komodo|lizard|dragon|skink|anole|tegu|gila|turtle|tortoise|terrapin|sea turtle|snapping turtle|slider|pond turtle|softshell|crocodile|alligator|caiman|gharial|tuatara/i.test(lower)) {
    className = 'Reptilia';
    iconicGroup = 'Reptiles';
  } else if (/frog|toad|salamander|newt|caecilian|axolotl|siren|mudpuppy|hellbender|poison dart|tree frog|bullfrog|spadefoot/i.test(lower)) {
    className = 'Amphibia';
    iconicGroup = 'Amphibians';
  } else if (/shark|ray|skate|sawfish|guitarfish|sturgeon|paddlefish|gar|bowfin|eel|moray|tarpon|bonefish|anchovy|herring|sardine|carp|goldfish|koi|minnow|catfish|piranha|pacu|tetra|salmon|trout|pike|cod|anglerfish|frogfish|clownfish|anemonefish|damselfish|tang|surgeonfish|angelfish|butterflyfish|wrasse|parrotfish|blenny|goby|barracuda|tuna|mackerel|swordfish|marlin|flounder|sole|halibut|seahorse|pipefish|lionfish|scorpionfish|sea bass|grouper|snapper|grunt|cichlid|discus|oscar|gourami|betta|guppy|molly|platy|swordtail|fish/i.test(lower)) {
    className = lower.includes('shark') || lower.includes('ray') || lower.includes('skate') || lower.includes('sawfish') 
      ? 'Chondrichthyes' 
      : 'Actinopterygii';
    iconicGroup = 'Fishes';
  } else if (/butterfly|moth|caterpillar|beetle|ladybug|firefly|ant|bee|wasp|hornet|fly|mosquito|dragonfly|damselfly|mantis|grasshopper|cricket|katydid|cicada|termite|spider|tarantula|scorpion|crab|hermit crab|lobster|crayfish|shrimp|krill|barnacle|octopus|squid|cuttlefish|nautilus|snail|slug|nudibranch|conch|clam|mussel|oyster|scallop|jellyfish|coral|anemone|starfish|sea star|sea urchin|sea cucumber|sponge|worm/i.test(lower)) {
    phylum = lower.includes('octopus') || lower.includes('squid') || lower.includes('snail') || lower.includes('clam')
      ? 'Mollusca'
      : (lower.includes('crab') || lower.includes('lobster') || lower.includes('spider') || lower.includes('beetle') ? 'Arthropoda' : 'Invertebrata');
    className = lower.includes('butterfly') || lower.includes('beetle') || lower.includes('ant') ? 'Insecta' : 'Invertebrata';
    iconicGroup = 'Invertebrates';
  } else if (/tree|pine|oak|maple|birch|willow|palm|fern|moss|cactus|succulent|orchid|rose|lily|tulip|sunflower|lotus|bamboo|cypress|redwood|sequoia|cedar|spruce|fir|mushroom|toadstool|flower|plant/i.test(lower)) {
    kingdom = lower.includes('mushroom') || lower.includes('toadstool') ? 'Fungi' : 'Plantae';
    phylum = kingdom === 'Plantae' ? 'Tracheophyta' : 'Ascomycota';
    className = 'Magnoliopsida';
    iconicGroup = 'Plants';
  }

  const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return {
    id: `custom-offline-${slug}-${Date.now().toString(36)}`,
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
    source: 'Offline Custom Entry'
  };
}

export async function searchTaxonomy(query: string): Promise<Taxon[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const q = trimmed.toLowerCase();
  const searchLocal = () => curatedTaxa.filter(t => 
    t.scientificName.toLowerCase().includes(q) ||
    t.vernacularName.toLowerCase().includes(q) ||
    t.family?.toLowerCase().includes(q) ||
    t.order?.toLowerCase().includes(q) ||
    t.genus?.toLowerCase().includes(q) ||
    (t.allVernaculars || []).some(v => v.toLowerCase().includes(q))
  );

  let results: Taxon[] = [];

  // If browser is offline, search local curated database
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    results = searchLocal();
  } else {
    // Try server Catalogue of Life API proxy
    try {
      const res = await fetch(`/api/taxonomy/search?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.results) && data.results.length > 0) {
          results = data.results;
        }
      }
    } catch (e) {
      console.warn('Network taxonomy search failed, falling back to local database:', e);
    }

    if (results.length === 0) {
      results = searchLocal();
    }
  }

  // Ensure there is always a custom taxon option available if user typed a specific name
  const exactMatch = results.some(
    t => t.vernacularName.toLowerCase() === q || t.scientificName.toLowerCase() === q
  );

  if (!exactMatch) {
    const customTaxon = createCustomTaxon(trimmed);
    results = [...results, customTaxon];
  }

  return results;
}

