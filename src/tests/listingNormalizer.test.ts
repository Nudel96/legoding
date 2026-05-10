import { describe, it, expect } from 'vitest';
import { normalizeEbayListing, normalizeAndDedup } from '../services/listingNormalizer';
import type { EbaySearchResult } from '../types';

function makeRawListing(overrides: Partial<EbaySearchResult> = {}): EbaySearchResult {
  return {
    itemId: 'v1|TEST001|0',
    title: 'LEGO Star Wars 75280 501st Clone Troopers NEU',
    itemWebUrl: 'https://www.ebay.de/itm/TEST001',
    image: { imageUrl: 'https://example.com/img.jpg' },
    price: { value: '35.00', currency: 'EUR' },
    shippingOptions: [{ shippingCostType: 'FIXED', shippingCost: { value: '4.99', currency: 'EUR' } }],
    seller: { username: 'test_seller', feedbackPercentage: '99.0', feedbackScore: 500 },
    condition: 'New',
    conditionId: '1000',
    itemLocation: { country: 'DE' },
    buyingOptions: ['FIXED_PRICE'],
    ...overrides,
  };
}

describe('listingNormalizer', () => {
  describe('normalizeEbayListing', () => {
    it('should correctly normalize price and shipping', () => {
      const raw = makeRawListing();
      const listing = normalizeEbayListing(raw);

      expect(listing.price).toBe(35.00);
      expect(listing.shipping).toBe(4.99);
      expect(listing.totalPrice).toBe(39.99);
    });

    it('should handle free shipping', () => {
      const raw = makeRawListing({
        shippingOptions: [{ shippingCostType: 'FIXED', shippingCost: { value: '0.00', currency: 'EUR' } }],
      });
      const listing = normalizeEbayListing(raw);
      expect(listing.shipping).toBe(0);
      expect(listing.totalPrice).toBe(35.00);
    });

    it('should handle missing shipping options', () => {
      const raw = makeRawListing({ shippingOptions: undefined });
      const listing = normalizeEbayListing(raw);
      expect(listing.shipping).toBe(0);
      expect(listing.totalPrice).toBe(35.00);
    });

    it('should map condition correctly', () => {
      expect(normalizeEbayListing(makeRawListing({ condition: 'New' })).condition).toBe('new');
      expect(normalizeEbayListing(makeRawListing({ condition: 'Used' })).condition).toBe('used');
      expect(normalizeEbayListing(makeRawListing({ condition: '' })).condition).toBe('unspecified');
    });

    it('should set marketplace to ebay', () => {
      const listing = normalizeEbayListing(makeRawListing());
      expect(listing.marketplace).toBe('ebay');
    });

    it('should generate a rawDataHash', () => {
      const listing = normalizeEbayListing(makeRawListing());
      expect(listing.rawDataHash).toBeTruthy();
      expect(listing.rawDataHash.length).toBe(64); // SHA-256
    });
  });

  describe('normalizeAndDedup', () => {
    it('should detect duplicate listings', () => {
      const raw1 = makeRawListing();
      const raw2 = makeRawListing(); // Same data = same hash
      const { listings, duplicateCount } = normalizeAndDedup([raw1, raw2], new Set());

      expect(listings.length).toBe(1);
      expect(duplicateCount).toBe(1);
    });

    it('should skip listings already in existing hashes', () => {
      const raw = makeRawListing();
      const listing = normalizeEbayListing(raw);
      const existingHashes = new Set([listing.rawDataHash]);

      const { listings, duplicateCount } = normalizeAndDedup([raw], existingHashes);
      expect(listings.length).toBe(0);
      expect(duplicateCount).toBe(1);
    });

    it('should allow different listings through', () => {
      const raw1 = makeRawListing({ itemId: 'v1|A|0', title: 'Item A' });
      const raw2 = makeRawListing({ itemId: 'v1|B|0', title: 'Item B' });
      const { listings, duplicateCount } = normalizeAndDedup([raw1, raw2], new Set());

      expect(listings.length).toBe(2);
      expect(duplicateCount).toBe(0);
    });
  });
});
