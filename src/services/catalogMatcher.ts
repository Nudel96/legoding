import { v4 as uuidv4 } from 'uuid';
import type { CatalogMatch, Listing, ItemType } from '../types';
import {
  SET_NUMBER_REGEX,
  STAR_WARS_KEYWORDS,
  MINIFIG_KEYWORDS,
  LOT_KEYWORDS,
  UCS_SETS,
  BRICKLINK_ITEM_TYPES,
} from '../config/constants';
import { findKeywords } from '../utils/text';
import { logger } from '../utils/logger';

export interface MatchResult {
  catalogMatch: CatalogMatch;
  bricklinkType: string; // 'S', 'M', 'P'
  bricklinkNo: string;   // e.g., '75192-1'
}

/**
 * Attempt to match a listing to a LEGO catalog item.
 * Returns a CatalogMatch with confidence score.
 */
export function matchListing(listing: Listing): CatalogMatch {
  const title = listing.title.toLowerCase();
  const reasons: string[] = [];
  let confidence = 0;
  let itemType: ItemType = 'UNKNOWN';
  let bricklinkNo = '';

  // Step 1: Extract set numbers from title
  const setNumbers = extractSetNumbers(listing.title);
  if (setNumbers.length > 0) {
    bricklinkNo = setNumbers[0] + '-1'; // BrickLink format: 75192-1
    confidence += 0.4;
    reasons.push(`Set number ${setNumbers[0]} found in title`);

    if (UCS_SETS[setNumbers[0]]) {
      confidence += 0.15;
      reasons.push(`Known UCS set: ${UCS_SETS[setNumbers[0]]}`);
      itemType = 'SET';
    } else {
      itemType = 'SET';
    }
  }

  // Step 2: Check Star Wars keywords
  const swKeywords = findKeywords(title, STAR_WARS_KEYWORDS);
  if (swKeywords.length > 0) {
    confidence += Math.min(0.2, swKeywords.length * 0.05);
    reasons.push(`Star Wars keywords: ${swKeywords.join(', ')}`);
  }

  // Step 3: Check if it's a minifig
  const minifigKeywords = findKeywords(title, MINIFIG_KEYWORDS);
  if (minifigKeywords.length > 0) {
    if (itemType === 'UNKNOWN' || (itemType === 'SET' && setNumbers.length === 0)) {
      itemType = 'MINIFIG';
    }
    confidence += 0.1;
    reasons.push(`Minifig keywords: ${minifigKeywords.join(', ')}`);

    // Try to extract BrickLink minifig number (e.g., sw0450)
    const minifigNo = extractMinifigNumber(listing.title);
    if (minifigNo) {
      bricklinkNo = minifigNo;
      confidence += 0.2;
      reasons.push(`Minifig number: ${minifigNo}`);
    }
  }

  // Step 4: Check if it's a lot/konvolut
  const lotKeywords = findKeywords(title, LOT_KEYWORDS);
  const isLot = lotKeywords.length > 0;
  if (isLot) {
    itemType = 'LOT';
    reasons.push(`Lot keywords: ${lotKeywords.join(', ')}`);
  }

  // Step 5: Check for LEGO brand confirmation
  if (/\blego\b/i.test(title) || /\bleggo\b/i.test(title)) {
    confidence += 0.1;
    reasons.push('LEGO brand mentioned');
  }

  // Lots are harder to value — cap confidence AFTER all additions
  if (isLot) {
    confidence = Math.min(confidence, 0.5);
  }

  // Clamp confidence
  confidence = Math.min(1, Math.max(0, confidence));

  const match: CatalogMatch = {
    id: uuidv4(),
    listingId: listing.id,
    itemType,
    bricklinkNo,
    rebrickableNo: setNumbers.length > 0 ? setNumbers[0] + '-1' : '',
    confidence: Math.round(confidence * 100) / 100,
    matchReason: reasons.join('; ') || 'No match signals found',
    createdAt: new Date().toISOString(),
  };

  logger.debug(`Catalog match for "${listing.title}": type=${match.itemType}, conf=${match.confidence}`);
  return match;
}

/**
 * Extract LEGO set numbers from a text string.
 */
export function extractSetNumbers(text: string): string[] {
  const matches = text.match(SET_NUMBER_REGEX);
  if (!matches) return [];
  // Deduplicate and filter to likely LEGO set ranges
  const unique = [...new Set(matches)];
  return unique.filter((n) => {
    const num = parseInt(n, 10);
    // Common LEGO Star Wars set number ranges
    return (
      (num >= 7100 && num <= 7999) ||   // Classic SW sets
      (num >= 10000 && num <= 10999) ||  // Creator Expert / UCS
      (num >= 30000 && num <= 30999) ||  // Polybags
      (num >= 40000 && num <= 40999) ||  // Promos
      (num >= 71000 && num <= 71999) ||  // Collectible Minifigs
      (num >= 75000 && num <= 75999) ||  // Modern Star Wars
      (num >= 76000 && num <= 77999)     // Extended range
    );
  });
}

/**
 * Extract BrickLink-style minifig number (e.g., sw0450) from text.
 */
export function extractMinifigNumber(text: string): string {
  const match = text.match(/\b(sw\d{3,4}[a-z]?)\b/i);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Determine the BrickLink item type code.
 */
export function getBricklinkTypeCode(itemType: ItemType): string {
  switch (itemType) {
    case 'SET': return BRICKLINK_ITEM_TYPES.SET;
    case 'MINIFIG': return BRICKLINK_ITEM_TYPES.MINIFIG;
    case 'PART': return BRICKLINK_ITEM_TYPES.PART;
    default: return BRICKLINK_ITEM_TYPES.SET;
  }
}
