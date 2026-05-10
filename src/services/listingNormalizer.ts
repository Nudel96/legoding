import { v4 as uuidv4 } from 'uuid';
import type { Listing, EbaySearchResult, ListingCondition, BuyingOption } from '../types';
import { parsePrice, calculateTotalCost } from '../utils/money';
import { normalizeTitle, generateRawDataHash } from '../utils/text';
import { logger } from '../utils/logger';

/**
 * Normalize a raw eBay search result into our internal Listing format.
 */
export function normalizeEbayListing(raw: EbaySearchResult): Listing {
  const price = parsePrice(raw.price.value);
  const shipping = extractShippingCost(raw);
  const totalPrice = calculateTotalCost(price, shipping);
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    marketplace: 'ebay',
    externalId: raw.itemId,
    title: raw.title,
    url: raw.itemWebUrl,
    imageUrl: raw.image?.imageUrl || '',
    price,
    shipping,
    totalPrice,
    currency: raw.price.currency || 'EUR',
    condition: mapCondition(raw.condition),
    sellerName: raw.seller?.username || 'unknown',
    sellerRating: raw.seller ? parseFloat(raw.seller.feedbackPercentage) : null,
    location: raw.itemLocation?.country || 'unknown',
    buyingOption: mapBuyingOption(raw.buyingOptions),
    firstSeenAt: now,
    lastSeenAt: now,
    rawDataHash: generateRawDataHash({
      externalId: raw.itemId,
      title: raw.title,
      price,
      shipping,
      condition: raw.condition,
    }),
    status: 'new',
  };
}

/**
 * Check if a listing is a duplicate by its rawDataHash.
 */
export function isDuplicate(listing: Listing, existingHashes: Set<string>): boolean {
  return existingHashes.has(listing.rawDataHash);
}

/**
 * Normalize a batch of eBay results, filtering duplicates.
 */
export function normalizeAndDedup(
  rawResults: EbaySearchResult[],
  existingHashes: Set<string>
): { listings: Listing[]; duplicateCount: number } {
  let duplicateCount = 0;
  const listings: Listing[] = [];
  const batchHashes = new Set<string>();

  for (const raw of rawResults) {
    const listing = normalizeEbayListing(raw);

    if (existingHashes.has(listing.rawDataHash) || batchHashes.has(listing.rawDataHash)) {
      duplicateCount++;
      continue;
    }

    batchHashes.add(listing.rawDataHash);
    listings.push(listing);
  }

  logger.info(`Normalized ${listings.length} listings, ${duplicateCount} duplicates skipped`);
  return { listings, duplicateCount };
}

// ─── Helpers ───

function extractShippingCost(raw: EbaySearchResult): number {
  if (!raw.shippingOptions?.length) return 0;
  const firstOption = raw.shippingOptions[0];
  if (firstOption.shippingCost) {
    return parsePrice(firstOption.shippingCost.value);
  }
  return 0;
}

function mapCondition(condition: string): ListingCondition {
  const lower = (condition || '').toLowerCase();
  if (lower.includes('new') || lower === 'neu') return 'new';
  if (lower.includes('used') || lower.includes('gebraucht')) return 'used';
  return 'unspecified';
}

function mapBuyingOption(options?: string[]): BuyingOption {
  if (!options?.length) return 'unknown';
  if (options.includes('FIXED_PRICE')) return 'FIXED_PRICE';
  if (options.includes('AUCTION')) return 'AUCTION';
  if (options.includes('BEST_OFFER')) return 'BEST_OFFER';
  return 'unknown';
}
