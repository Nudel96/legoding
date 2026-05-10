import { describe, it, expect } from 'vitest';
import { parsePrice, calculateTotalCost, calculateMargin, roundMoney, clamp } from '../utils/money';
import { normalizeTitle, hashString, generateRawDataHash, countKeywords, findKeywords } from '../utils/text';

describe('money utilities', () => {
  describe('parsePrice', () => {
    it('should parse number values', () => {
      expect(parsePrice(35.99)).toBe(35.99);
    });

    it('should parse string prices with dot', () => {
      expect(parsePrice('35.99')).toBe(35.99);
    });

    it('should parse string prices with comma', () => {
      expect(parsePrice('35,99')).toBe(35.99);
    });

    it('should handle currency symbols', () => {
      expect(parsePrice('€35.99')).toBe(35.99);
      expect(parsePrice('35.99 EUR')).toBe(35.99);
    });

    it('should return 0 for invalid strings', () => {
      expect(parsePrice('abc')).toBe(0);
      expect(parsePrice('')).toBe(0);
    });
  });

  describe('calculateTotalCost', () => {
    it('should add price and shipping', () => {
      expect(calculateTotalCost(35, 4.99)).toBe(39.99);
    });

    it('should handle zero shipping', () => {
      expect(calculateTotalCost(100, 0)).toBe(100);
    });
  });

  describe('calculateMargin', () => {
    it('should calculate positive margin', () => {
      const { marginAbs, marginPct } = calculateMargin(100, 50);
      expect(marginAbs).toBe(50);
      expect(marginPct).toBe(100);
    });

    it('should calculate negative margin', () => {
      const { marginAbs, marginPct } = calculateMargin(30, 50);
      expect(marginAbs).toBe(-20);
      expect(marginPct).toBe(-40);
    });

    it('should handle zero cost', () => {
      const { marginPct } = calculateMargin(50, 0);
      expect(marginPct).toBe(0);
    });
  });

  describe('clamp', () => {
    it('should clamp values', () => {
      expect(clamp(50, 0, 100)).toBe(50);
      expect(clamp(-10, 0, 100)).toBe(0);
      expect(clamp(150, 0, 100)).toBe(100);
    });
  });
});

describe('text utilities', () => {
  describe('normalizeTitle', () => {
    it('should lowercase and trim', () => {
      expect(normalizeTitle('  LEGO Star Wars  ')).toBe('lego star wars');
    });

    it('should collapse whitespace', () => {
      expect(normalizeTitle('LEGO  Star   Wars')).toBe('lego star wars');
    });
  });

  describe('hashString', () => {
    it('should produce consistent hashes', () => {
      const h1 = hashString('test');
      const h2 = hashString('test');
      expect(h1).toBe(h2);
    });

    it('should produce different hashes for different inputs', () => {
      const h1 = hashString('a');
      const h2 = hashString('b');
      expect(h1).not.toBe(h2);
    });
  });

  describe('countKeywords', () => {
    it('should count matching keywords', () => {
      expect(countKeywords('LEGO Star Wars sealed complete', ['sealed', 'complete', 'missing'])).toBe(2);
    });
  });

  describe('findKeywords', () => {
    it('should return matching keywords', () => {
      const found = findKeywords('LEGO Star Wars sealed complete rare', ['sealed', 'complete', 'rare', 'missing']);
      expect(found).toEqual(['sealed', 'complete', 'rare']);
    });
  });
});
