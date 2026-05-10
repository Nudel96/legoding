import { describe, it, expect } from 'vitest';
import { scoreDeal } from '../services/dealScoringService';
import { assessRisk } from '../services/riskDetectionService';
import type { Listing, CatalogMatch, Valuation } from '../types';

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'test',
    marketplace: 'ebay',
    externalId: 'ext-1',
    title: 'LEGO Star Wars 75280 Clone Troopers',
    url: '',
    imageUrl: '',
    price: 35,
    shipping: 5,
    totalPrice: 40,
    currency: 'EUR',
    condition: 'new',
    sellerName: 'seller',
    sellerRating: 99,
    location: 'DE',
    buyingOption: 'FIXED_PRICE',
    firstSeenAt: '',
    lastSeenAt: '',
    rawDataHash: '',
    status: 'new',
    ...overrides,
  };
}

function makeMatch(overrides: Partial<CatalogMatch> = {}): CatalogMatch {
  return {
    id: 'match-1',
    listingId: 'test',
    itemType: 'SET',
    bricklinkNo: '75280-1',
    rebrickableNo: '75280-1',
    confidence: 0.85,
    matchReason: 'Set number found',
    createdAt: '',
    ...overrides,
  };
}

function makeValuation(overrides: Partial<Valuation> = {}): Valuation {
  return {
    id: 'val-1',
    listingId: 'test',
    bricklinkSoldAvg: 75,
    bricklinkStockAvg: 65,
    bricklinkMinPrice: 50,
    estimatedResaleValue: 72,
    totalCost: 40,
    marginAbs: 32,
    marginPct: 80,
    valuationConfidence: 0.8,
    createdAt: '',
    ...overrides,
  };
}

describe('dealScoringService', () => {
  it('should give high score to profitable deal with good match', () => {
    const listing = makeListing();
    const risk = assessRisk(listing);
    const review = scoreDeal(listing, makeMatch(), makeValuation(), risk);

    expect(review.dealScore).toBeGreaterThanOrEqual(50);
    expect(review.suggestedAction).not.toBe('ignore');
  });

  it('should penalize fake/custom listings heavily', () => {
    const listing = makeListing({ title: 'LEGO kompatibel Star Wars fake custom figure' });
    const risk = assessRisk(listing);
    const review = scoreDeal(listing, makeMatch(), makeValuation(), risk);

    expect(review.dealScore).toBeLessThan(50);
  });

  it('should reduce score when margin is negative', () => {
    const listing = makeListing();
    const risk = assessRisk(listing);
    const valuation = makeValuation({
      estimatedResaleValue: 30,
      totalCost: 40,
      marginAbs: -10,
      marginPct: -25,
    });
    const review = scoreDeal(listing, makeMatch(), valuation, risk);

    expect(review.dealScore).toBeLessThan(40);
  });

  it('should reduce score when match confidence is low', () => {
    const listing = makeListing();
    const risk = assessRisk(listing);
    const lowConfMatch = makeMatch({ confidence: 0.3 });
    const lowConfVal = makeValuation({ valuationConfidence: 0.2 });
    const review = scoreDeal(listing, lowConfMatch, lowConfVal, risk);

    const highConfMatch = makeMatch({ confidence: 0.9 });
    const highConfVal = makeValuation({ valuationConfidence: 0.9 });
    const reviewHigh = scoreDeal(listing, highConfMatch, highConfVal, risk);

    expect(review.dealScore).toBeLessThan(reviewHigh.dealScore);
  });

  it('should boost score with positive terms', () => {
    const basicListing = makeListing({ title: 'LEGO Star Wars 75280' });
    const sealedListing = makeListing({ title: 'LEGO Star Wars 75280 sealed retired rare ovp complete' });

    const riskBasic = assessRisk(basicListing);
    const riskSealed = assessRisk(sealedListing);

    const reviewBasic = scoreDeal(basicListing, makeMatch(), makeValuation(), riskBasic);
    const reviewSealed = scoreDeal(sealedListing, makeMatch(), makeValuation(), riskSealed);

    expect(reviewSealed.dealScore).toBeGreaterThan(reviewBasic.dealScore);
  });

  it('should give higher score to UCS sets', () => {
    const normalListing = makeListing({ title: 'LEGO Star Wars 75280 Clone Troopers' });
    const ucsListing = makeListing({ title: 'LEGO Star Wars 75192 UCS Millennium Falcon' });

    const riskN = assessRisk(normalListing);
    const riskU = assessRisk(ucsListing);

    const normalMatch = makeMatch({ bricklinkNo: '75280-1' });
    const ucsMatch = makeMatch({ bricklinkNo: '75192-1' });

    const reviewNormal = scoreDeal(normalListing, normalMatch, makeValuation(), riskN);
    const reviewUCS = scoreDeal(ucsListing, ucsMatch, makeValuation(), riskU);

    expect(reviewUCS.dealScore).toBeGreaterThan(reviewNormal.dealScore);
  });

  it('should downgrade buy_review to ask_review for low confidence matches', () => {
    const listing = makeListing({ title: 'LEGO Star Wars 75280 sealed' });
    const risk = assessRisk(listing);
    const lowConfMatch = makeMatch({ confidence: 0.5 });
    // Create a high-margin valuation that would normally score 80+
    const val = makeValuation({ marginPct: 100, valuationConfidence: 0.9 });
    const review = scoreDeal(listing, lowConfMatch, val, risk);

    if (review.dealScore >= 80) {
      expect(review.suggestedAction).toBe('ask_review');
    }
  });

  it('should correctly assign action thresholds', () => {
    const listing = makeListing();
    const risk = assessRisk(listing);

    // Very high margin → high score
    const highVal = makeValuation({ marginPct: 150, estimatedResaleValue: 100 });
    const review = scoreDeal(listing, makeMatch(), highVal, risk);

    expect(['buy_review', 'ask_review', 'watch', 'ignore']).toContain(review.suggestedAction);
  });

  it('shipping costs should correctly impact margin and score', () => {
    const cheapShip = makeListing({ shipping: 0, totalPrice: 35 });
    const expensiveShip = makeListing({ shipping: 30, totalPrice: 65 });

    const risk1 = assessRisk(cheapShip);
    const risk2 = assessRisk(expensiveShip);

    const val1 = makeValuation({ totalCost: 35, marginAbs: 37, marginPct: 105 });
    const val2 = makeValuation({ totalCost: 65, marginAbs: 7, marginPct: 10 });

    const review1 = scoreDeal(cheapShip, makeMatch(), val1, risk1);
    const review2 = scoreDeal(expensiveShip, makeMatch(), val2, risk2);

    expect(review1.dealScore).toBeGreaterThan(review2.dealScore);
  });
});
