import type { Listing } from '../types';
import { NEGATIVE_KEYWORDS, POSITIVE_KEYWORDS } from '../config/constants';
import { findKeywords } from '../utils/text';
import { clamp } from '../utils/money';

export interface RiskAssessment {
  riskScore: number;         // 0–100
  negativeKeywords: string[];
  positiveKeywords: string[];
  riskSummary: string;
}

/**
 * Assess the risk level of a listing based on title keywords and signals.
 * Score 0 = no risk, 100 = maximum risk.
 */
export function assessRisk(listing: Listing): RiskAssessment {
  const title = listing.title.toLowerCase();
  const negatives = findKeywords(title, NEGATIVE_KEYWORDS);
  const positives = findKeywords(title, POSITIVE_KEYWORDS);

  let riskScore = 0;
  const riskFactors: string[] = [];

  // ─── Negative keyword scoring ───
  // Critical keywords that strongly indicate fake/custom
  const criticalKeywords = ['fake', 'replica', 'not lego', 'kompatibel', 'custom figure', 'compatible', 'nachbau'];
  const criticalFound = negatives.filter((kw) => criticalKeywords.includes(kw));
  if (criticalFound.length > 0) {
    riskScore += 60;
    riskFactors.push(`Critical risk: ${criticalFound.join(', ')}`);
  }

  // Moderate keywords
  const moderateKeywords = ['incomplete', 'missing', 'damaged', 'beschädigt', 'unvollständig', 'geklebt', 'glued', 'cracked'];
  const moderateFound = negatives.filter((kw) => moderateKeywords.includes(kw));
  if (moderateFound.length > 0) {
    riskScore += moderateFound.length * 15;
    riskFactors.push(`Condition issues: ${moderateFound.join(', ')}`);
  }

  // Minor keywords
  const minorKeywords = ['no box', 'no instructions', 'ohne anleitung', 'parts only', 'moc', 'playworn', 'vergilbt', 'bite marks'];
  const minorFound = negatives.filter((kw) => minorKeywords.includes(kw));
  if (minorFound.length > 0) {
    riskScore += minorFound.length * 8;
    riskFactors.push(`Minor issues: ${minorFound.join(', ')}`);
  }

  // ─── Seller risk signals ───
  if (listing.sellerRating !== null && listing.sellerRating < 95) {
    riskScore += 10;
    riskFactors.push(`Low seller rating: ${listing.sellerRating}%`);
  }

  if (listing.location === 'CN' || listing.location === 'HK') {
    riskScore += 15;
    riskFactors.push(`Shipping from ${listing.location} — higher fake risk`);
  }

  // ─── Price anomaly ───
  if (listing.totalPrice < 5) {
    riskScore += 10;
    riskFactors.push('Suspiciously low price');
  }

  // ─── Positive terms reduce risk slightly ───
  if (positives.length > 0) {
    const reduction = Math.min(20, positives.length * 5);
    riskScore -= reduction;
    riskFactors.push(`Positive signals (−${reduction} risk): ${positives.join(', ')}`);
  }

  riskScore = clamp(riskScore, 0, 100);

  const riskSummary =
    riskFactors.length > 0
      ? riskFactors.join('. ')
      : 'No risk factors detected';

  return {
    riskScore,
    negativeKeywords: negatives,
    positiveKeywords: positives,
    riskSummary,
  };
}
