import { describe, it, expect } from 'vitest';
import { generateWantedListXml } from '../services/wantedListService';
import { buildTextSummary } from '../services/notificationService';
import type { PipelineResult, Listing, CatalogMatch, Valuation, DealReview } from '../types';

function makePipelineResult(overrides: {
  title?: string;
  score?: number;
  risk?: number;
  action?: string;
  type?: string;
  bricklinkNo?: string;
  price?: number;
  marginPct?: number;
  condition?: string;
} = {}): PipelineResult {
  const listing: Listing = {
    id: 'l-1',
    marketplace: 'ebay',
    externalId: 'ext-1',
    title: overrides.title || 'LEGO Star Wars 75192 Millennium Falcon',
    url: 'https://ebay.de/itm/123',
    imageUrl: '',
    price: overrides.price || 500,
    shipping: 0,
    totalPrice: overrides.price || 500,
    currency: 'EUR',
    condition: (overrides.condition as any) || 'used',
    sellerName: 'seller1',
    sellerRating: 99,
    location: 'DE',
    buyingOption: 'FIXED_PRICE',
    firstSeenAt: '2026-01-01T00:00:00Z',
    lastSeenAt: '2026-01-01T00:00:00Z',
    rawDataHash: 'abc123',
    status: 'new',
  };

  const catalogMatch: CatalogMatch = {
    id: 'cm-1',
    listingId: 'l-1',
    itemType: (overrides.type as any) || 'SET',
    bricklinkNo: overrides.bricklinkNo || '75192-1',
    rebrickableNo: '75192-1',
    confidence: 0.8,
    matchReason: 'Test match',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const valuation: Valuation = {
    id: 'v-1',
    listingId: 'l-1',
    bricklinkSoldAvg: 800,
    bricklinkStockAvg: 900,
    bricklinkMinPrice: 700,
    estimatedResaleValue: 800,
    totalCost: overrides.price || 500,
    marginAbs: 300,
    marginPct: overrides.marginPct || 60,
    valuationConfidence: 0.7,
    createdAt: '2026-01-01T00:00:00Z',
  };

  const dealReview: DealReview = {
    id: 'dr-1',
    listingId: 'l-1',
    dealScore: overrides.score ?? 75,
    riskScore: overrides.risk ?? 0,
    suggestedAction: (overrides.action as any) || 'ask_review',
    aiSummary: 'Good deal',
    riskSummary: 'Low risk',
    draftedMessage: 'Hallo...',
    approvedByUser: false,
    approvedAt: null,
    status: 'pending',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  return { listing, catalogMatch, valuation, dealReview };
}

describe('wantedListService', () => {
  describe('generateWantedListXml', () => {
    it('should generate valid XML for qualifying results', () => {
      const results = [makePipelineResult({ score: 75, bricklinkNo: '75192-1' })];
      const xml = generateWantedListXml(results, { minScore: 40 });

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<INVENTORY>');
      expect(xml).toContain('<ITEM>');
      expect(xml).toContain('<ITEMTYPE>S</ITEMTYPE>');
      expect(xml).toContain('<ITEMID>75192</ITEMID>');
      expect(xml).toContain('<CONDITION>U</CONDITION>');
      expect(xml).toContain('<NOTIFY>Y</NOTIFY>');
      expect(xml).toContain('</INVENTORY>');
    });

    it('should use condition N for new items', () => {
      const results = [makePipelineResult({ score: 75, condition: 'new' })];
      const xml = generateWantedListXml(results, { minScore: 40 });
      expect(xml).toContain('<CONDITION>N</CONDITION>');
    });

    it('should use M type for minifigs', () => {
      const results = [makePipelineResult({ score: 75, type: 'MINIFIG', bricklinkNo: 'sw0450' })];
      const xml = generateWantedListXml(results, { minScore: 40 });
      expect(xml).toContain('<ITEMTYPE>M</ITEMTYPE>');
      expect(xml).toContain('<ITEMID>sw0450</ITEMID>');
    });

    it('should exclude LOT and UNKNOWN types', () => {
      const results = [
        makePipelineResult({ score: 75, type: 'LOT' }),
        makePipelineResult({ score: 75, type: 'UNKNOWN', bricklinkNo: '' }),
      ];
      const xml = generateWantedListXml(results, { minScore: 40 });
      expect(xml).not.toContain('<ITEM>');
    });

    it('should exclude low-score results', () => {
      const results = [makePipelineResult({ score: 20 })];
      const xml = generateWantedListXml(results, { minScore: 40 });
      expect(xml).not.toContain('<ITEM>');
    });

    it('should include max price at 60% of resale value', () => {
      const results = [makePipelineResult({ score: 75 })];
      const xml = generateWantedListXml(results, { minScore: 40, includeMaxPrice: true });
      // Resale is 800, 60% = 480
      expect(xml).toContain('<MAXPRICE>480.00</MAXPRICE>');
    });

    it('should return empty inventory for no results', () => {
      const xml = generateWantedListXml([], { minScore: 40 });
      expect(xml).toContain('<INVENTORY></INVENTORY>');
    });

    it('should include score in remarks', () => {
      const results = [makePipelineResult({ score: 85 })];
      const xml = generateWantedListXml(results, { minScore: 40 });
      expect(xml).toContain('Score:85');
    });
  });
});

describe('notificationService', () => {
  describe('buildTextSummary', () => {
    it('should build text summary for qualifying deals', () => {
      const results = [
        makePipelineResult({ score: 75, title: 'Captain Rex Minifig' }),
      ];
      const summary = buildTextSummary(results, 40);
      expect(summary).toContain('1 Deal(s)');
      expect(summary).toContain('Score: 75');
      expect(summary).toContain('Captain Rex');
    });

    it('should return empty message when no qualifying deals', () => {
      const results = [makePipelineResult({ score: 10 })];
      const summary = buildTextSummary(results, 40);
      expect(summary).toContain('Keine qualifizierten Deals');
    });

    it('should include multiple deals', () => {
      const results = [
        makePipelineResult({ score: 85, title: 'Deal A' }),
        makePipelineResult({ score: 65, title: 'Deal B' }),
      ];
      const summary = buildTextSummary(results, 40);
      expect(summary).toContain('2 Deal(s)');
    });
  });
});
