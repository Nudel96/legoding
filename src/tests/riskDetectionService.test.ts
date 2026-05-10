import { describe, it, expect } from 'vitest';
import { assessRisk } from '../services/riskDetectionService';
import type { Listing } from '../types';

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'test',
    marketplace: 'ebay',
    externalId: 'ext-1',
    title: 'LEGO Star Wars 75280',
    url: '',
    imageUrl: '',
    price: 50,
    shipping: 5,
    totalPrice: 55,
    currency: 'EUR',
    condition: 'used',
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

describe('riskDetectionService', () => {
  it('should return low risk for clean listings', () => {
    const risk = assessRisk(makeListing({ title: 'LEGO Star Wars 75280 Clone Troopers sealed complete' }));
    expect(risk.riskScore).toBeLessThanOrEqual(10);
  });

  it('should heavily penalize fake/replica keywords', () => {
    const risk = assessRisk(makeListing({ title: 'Star Wars fake clone trooper not lego' }));
    expect(risk.riskScore).toBeGreaterThanOrEqual(50);
    expect(risk.negativeKeywords).toContain('fake');
    expect(risk.negativeKeywords).toContain('not lego');
  });

  it('should penalize custom/kompatibel keywords', () => {
    const risk = assessRisk(makeListing({ title: 'LEGO kompatibel Star Wars custom figure' }));
    expect(risk.riskScore).toBeGreaterThanOrEqual(50);
    expect(risk.negativeKeywords).toContain('kompatibel');
    expect(risk.negativeKeywords).toContain('custom figure');
  });

  it('should penalize damage keywords', () => {
    const risk = assessRisk(makeListing({ title: 'LEGO Star Wars damaged incomplete missing parts' }));
    expect(risk.riskScore).toBeGreaterThan(20);
    expect(risk.negativeKeywords).toContain('damaged');
    expect(risk.negativeKeywords).toContain('incomplete');
    expect(risk.negativeKeywords).toContain('missing');
  });

  it('should increase risk for China/HK origin', () => {
    const risk = assessRisk(makeListing({ location: 'CN' }));
    expect(risk.riskScore).toBeGreaterThan(0);
    expect(risk.riskSummary).toContain('CN');
  });

  it('should increase risk for low seller rating', () => {
    const risk = assessRisk(makeListing({ sellerRating: 90 }));
    expect(risk.riskScore).toBeGreaterThan(0);
  });

  it('should reduce risk with positive keywords', () => {
    const riskClean = assessRisk(makeListing({ title: 'LEGO Star Wars Set' }));
    const riskPositive = assessRisk(makeListing({ title: 'LEGO Star Wars Set sealed complete original lego' }));
    expect(riskPositive.riskScore).toBeLessThanOrEqual(riskClean.riskScore);
  });

  it('should cap risk at 100', () => {
    const risk = assessRisk(makeListing({
      title: 'fake replica custom not lego kompatibel damaged cracked glued incomplete',
      location: 'CN',
      sellerRating: 80,
    }));
    expect(risk.riskScore).toBeLessThanOrEqual(100);
  });

  it('should flag suspiciously low prices', () => {
    const risk = assessRisk(makeListing({ totalPrice: 2 }));
    expect(risk.riskScore).toBeGreaterThan(0);
  });
});
