import { describe, it, expect } from 'vitest';
import { matchListing, extractSetNumbers, extractMinifigNumber } from '../services/catalogMatcher';
import type { Listing } from '../types';

function makeListing(title: string): Listing {
  return {
    id: 'test-id',
    marketplace: 'ebay',
    externalId: 'ext-1',
    title,
    url: 'https://example.com',
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
  };
}

describe('catalogMatcher', () => {
  describe('extractSetNumbers', () => {
    it('should extract standard Star Wars set numbers', () => {
      expect(extractSetNumbers('LEGO 75192 Millennium Falcon')).toEqual(['75192']);
      expect(extractSetNumbers('Set 75280 Clone Troopers')).toEqual(['75280']);
      expect(extractSetNumbers('75313 AT-AT UCS')).toEqual(['75313']);
    });

    it('should extract multiple set numbers', () => {
      const result = extractSetNumbers('LEGO 75192 + 75313 Bundle');
      expect(result).toContain('75192');
      expect(result).toContain('75313');
    });

    it('should handle UCS creator expert numbers', () => {
      expect(extractSetNumbers('LEGO 10179 UCS Falcon')).toEqual(['10179']);
    });

    it('should return empty for no set numbers', () => {
      expect(extractSetNumbers('LEGO Star Wars Figuren Sammlung')).toEqual([]);
    });
  });

  describe('extractMinifigNumber', () => {
    it('should extract BrickLink minifig numbers', () => {
      expect(extractMinifigNumber('Captain Rex sw0450 rare')).toBe('sw0450');
      expect(extractMinifigNumber('Clone Trooper sw0910')).toBe('sw0910');
    });

    it('should return empty for no minifig number', () => {
      expect(extractMinifigNumber('LEGO Star Wars Clone Trooper')).toBe('');
    });
  });

  describe('matchListing', () => {
    it('should identify a set with set number', () => {
      const match = matchListing(makeListing('LEGO Star Wars 75192 Millennium Falcon'));
      expect(match.itemType).toBe('SET');
      expect(match.bricklinkNo).toBe('75192-1');
      expect(match.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should identify a UCS set with high confidence', () => {
      const match = matchListing(makeListing('LEGO Star Wars 75192 UCS Millennium Falcon SEALED'));
      expect(match.itemType).toBe('SET');
      expect(match.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should identify a minifigure', () => {
      const match = matchListing(makeListing('LEGO Star Wars Minifigure Captain Rex sw0450'));
      expect(match.itemType).toBe('MINIFIG');
      expect(match.bricklinkNo).toBe('sw0450');
      expect(match.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should identify a lot/konvolut', () => {
      const match = matchListing(makeListing('LEGO Star Wars Konvolut Figuren Sammlung'));
      expect(match.itemType).toBe('LOT');
    });

    it('should have low confidence for misspelled listings', () => {
      const match = matchListing(makeListing('leggo starwars figur'));
      expect(match.confidence).toBeLessThanOrEqual(0.5);
    });

    it('should detect LEGO brand in title', () => {
      const match = matchListing(makeListing('LEGO Clone Trooper'));
      expect(match.matchReason).toContain('LEGO brand');
    });

    it('should limit lot confidence', () => {
      const match = matchListing(makeListing('LEGO Star Wars 75192 75313 Bulk Lot Collection'));
      expect(match.itemType).toBe('LOT');
      expect(match.confidence).toBeLessThanOrEqual(0.5);
    });
  });
});
