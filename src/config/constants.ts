/** Application-wide constants */

export const LEGO_STAR_WARS_CATEGORY_EBAY = '19006'; // eBay category for LEGO Sets

/** Known LEGO Star Wars set number patterns */
export const SET_NUMBER_REGEX = /\b(10\d{3}|75\d{3}|76\d{3}|77\d{3}|30\d{3}|40\d{3}|71\d{3}|7\d{3})\b/g;

/** Risk keywords — negative indicators */
export const NEGATIVE_KEYWORDS = [
  'incomplete', 'missing', 'replica', 'custom', 'fake', 'damaged',
  'no box', 'no instructions', 'parts only', 'not lego', 'kompatibel',
  'custom figure', 'moc', 'ohne figuren', 'ohne anleitung', 'beschädigt',
  'unvollständig', 'gebraucht unvollständig', 'vergilbt', 'geklebt',
  'glued', 'cracked', 'bite marks', 'playworn', 'yellowed',
  'nicht original', 'nachbau', 'compatible', 'alt. brand', 'no minifigs',
];

/** Positive indicators */
export const POSITIVE_KEYWORDS = [
  'sealed', 'misb', 'new', 'retired', 'rare', 'complete', 'with box',
  'with instructions', 'clone wars', 'ucs', 'limited', 'original lego',
  '100% complete', 'ungeöffnet', 'ovp', 'vollständig', 'mit anleitung',
  'mit box', 'selten', 'neu', 'versiegelt', 'mint', 'bnib',
  'exclusive', 'exklusiv', 'discontinued',
];

/** Star Wars related keywords for catalog matching */
export const STAR_WARS_KEYWORDS = [
  'star wars', 'starwars', 'star war', 'krieg der sterne',
  'clone trooper', 'clonetrooper', 'clone tropper',
  'stormtrooper', 'darth vader', 'darth revan', 'luke skywalker',
  'han solo', 'boba fett', 'mandalorian', 'mando',
  'millennium falcon', 'x-wing', 'xwing', 'tie fighter',
  'at-at', 'at-st', 'death star', 'todesstern',
  'captain rex', 'commander cody', 'ahsoka', 'yoda',
  'lightsaber', 'jedi', 'sith', 'empire', 'rebel',
  'imperial', 'galactic', 'republic', 'separatist',
];

/** Minifig-specific keywords */
export const MINIFIG_KEYWORDS = [
  'minifigure', 'minifig', 'mini figure', 'mini fig',
  'figur', 'figure', 'figuren', 'minifigures', 'minifigs',
  'sammelfigur', 'figuren set', 'figurenpaket',
];

/** Lot/bulk keywords */
export const LOT_KEYWORDS = [
  'lot', 'konvolut', 'sammlung', 'bulk', 'collection',
  'paket', 'set of', 'bundle', 'mixed', 'gemischt',
  'verschiedene', 'diverse', 'assorted',
];

/** Well-known UCS sets */
export const UCS_SETS: Record<string, string> = {
  '10179': 'Millennium Falcon (UCS)',
  '75192': 'Millennium Falcon (UCS)',
  '75252': 'Imperial Star Destroyer (UCS)',
  '75313': 'AT-AT (UCS)',
  '75331': 'Razor Crest (UCS)',
  '75341': 'Luke Skywalker\'s Landspeeder (UCS)',
  '75367': 'Venator-Class Republic Attack Cruiser (UCS)',
  '10143': 'Death Star II (UCS)',
  '10221': 'Super Star Destroyer (UCS)',
  '75060': 'Slave I (UCS)',
  '75095': 'TIE Fighter (UCS)',
  '75181': 'Y-Wing Starfighter (UCS)',
  '75275': 'A-Wing Starfighter (UCS)',
  '75309': 'Republic Gunship (UCS)',
};

/** Deal Score thresholds */
export const DEAL_ACTIONS = {
  BUY_REVIEW: { min: 80, max: 100, action: 'buy_review' as const },
  ASK_REVIEW: { min: 60, max: 79, action: 'ask_review' as const },
  WATCH: { min: 40, max: 59, action: 'watch' as const },
  IGNORE: { min: 0, max: 39, action: 'ignore' as const },
};

/** Score weights */
export const SCORE_WEIGHTS = {
  MARGIN: 40,
  RARITY: 20,
  CONFIDENCE: 20,
  POSITIVE_TERMS: 10,
  URGENCY: 10,
  MAX_RISK_PENALTY: 50,
};

/** BrickLink item types */
export const BRICKLINK_ITEM_TYPES = {
  SET: 'S',
  MINIFIG: 'M',
  PART: 'P',
  GEAR: 'G',
} as const;
