import { v4 as uuidv4 } from 'uuid';
import type { Listing, CatalogMatch, Valuation } from '../types';
import { getPriceGuide } from '../connectors/bricklinkConnector';
import { getBricklinkTypeCode } from './catalogMatcher';
import { calculateMargin, roundMoney } from '../utils/money';
import { logger } from '../utils/logger';

/**
 * Calculate the valuation of a listing based on BrickLink price data.
 */
export async function valuateListing(
  listing: Listing,
  catalogMatch: CatalogMatch | null
): Promise<Valuation> {
  const now = new Date().toISOString();
  const totalCost = listing.totalPrice;

  // If no catalog match or no BrickLink number, return minimal valuation
  if (!catalogMatch || !catalogMatch.bricklinkNo || catalogMatch.itemType === 'LOT') {
    return createMinimalValuation(listing.id, totalCost, catalogMatch, now);
  }

  const blType = getBricklinkTypeCode(catalogMatch.itemType);
  const blNo = catalogMatch.bricklinkNo;

  // Determine condition for price guide lookup
  const condition = listing.condition === 'new' ? 'N' : 'U';

  // Fetch price guides: sold average (primary), stock average (secondary)
  const [soldGuide, stockGuide] = await Promise.all([
    getPriceGuide(blType, blNo, { newOrUsed: condition, guideType: 'sold' }),
    getPriceGuide(blType, blNo, { newOrUsed: condition, guideType: 'stock' }),
  ]);

  const soldAvg = soldGuide ? parseFloat(soldGuide.avg_price) : null;
  const stockAvg = stockGuide ? parseFloat(stockGuide.avg_price) : null;
  const minPrice = soldGuide ? parseFloat(soldGuide.min_price) : null;

  // Calculate estimated resale value
  const { estimatedResaleValue, valuationConfidence } = calculateResaleValue(
    soldAvg,
    stockAvg,
    catalogMatch.confidence
  );

  const { marginAbs, marginPct } = calculateMargin(estimatedResaleValue, totalCost);

  const valuation: Valuation = {
    id: uuidv4(),
    listingId: listing.id,
    bricklinkSoldAvg: soldAvg ? roundMoney(soldAvg) : null,
    bricklinkStockAvg: stockAvg ? roundMoney(stockAvg) : null,
    bricklinkMinPrice: minPrice ? roundMoney(minPrice) : null,
    estimatedResaleValue: roundMoney(estimatedResaleValue),
    totalCost: roundMoney(totalCost),
    marginAbs,
    marginPct,
    valuationConfidence,
    createdAt: now,
  };

  logger.debug(
    `Valuation for "${listing.title}": resale=${valuation.estimatedResaleValue}, ` +
    `margin=${valuation.marginPct}%, confidence=${valuation.valuationConfidence}`
  );

  return valuation;
}

/**
 * Calculate estimated resale value from price guide data.
 * Sold average is weighted higher than stock average.
 */
function calculateResaleValue(
  soldAvg: number | null,
  stockAvg: number | null,
  matchConfidence: number
): { estimatedResaleValue: number; valuationConfidence: number } {
  let estimatedResaleValue = 0;
  let valuationConfidence = 0;

  if (soldAvg && stockAvg) {
    // Both available: weight sold higher (70/30)
    estimatedResaleValue = soldAvg * 0.7 + stockAvg * 0.3;
    valuationConfidence = 0.85;
  } else if (soldAvg) {
    // Only sold data
    estimatedResaleValue = soldAvg;
    valuationConfidence = 0.75;
  } else if (stockAvg) {
    // Only stock data — less reliable
    estimatedResaleValue = stockAvg * 0.85; // Discount for stock-only
    valuationConfidence = 0.5;
  } else {
    // No price data
    valuationConfidence = 0;
  }

  // Reduce confidence if catalog match confidence is low
  valuationConfidence *= matchConfidence;
  valuationConfidence = Math.round(valuationConfidence * 100) / 100;

  return {
    estimatedResaleValue: roundMoney(estimatedResaleValue),
    valuationConfidence,
  };
}

/**
 * Create a minimal valuation when no catalog match is available.
 */
function createMinimalValuation(
  listingId: string,
  totalCost: number,
  catalogMatch: CatalogMatch | null,
  now: string
): Valuation {
  return {
    id: uuidv4(),
    listingId,
    bricklinkSoldAvg: null,
    bricklinkStockAvg: null,
    bricklinkMinPrice: null,
    estimatedResaleValue: 0,
    totalCost: roundMoney(totalCost),
    marginAbs: -totalCost,
    marginPct: -100,
    valuationConfidence: 0,
    createdAt: now,
  };
}
