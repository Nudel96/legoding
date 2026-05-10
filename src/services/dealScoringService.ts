import { v4 as uuidv4 } from 'uuid';
import type { Listing, CatalogMatch, Valuation, DealReview, SuggestedAction } from '../types';
import { SCORE_WEIGHTS, DEAL_ACTIONS, UCS_SETS, POSITIVE_KEYWORDS } from '../config/constants';
import { clamp } from '../utils/money';
import { findKeywords } from '../utils/text';
import { RiskAssessment } from './riskDetectionService';
import { logger } from '../utils/logger';

/**
 * Calculate the overall deal score (0–100) for a listing.
 */
export function scoreDeal(
  listing: Listing,
  catalogMatch: CatalogMatch | null,
  valuation: Valuation | null,
  risk: RiskAssessment
): DealReview {
  const now = new Date().toISOString();

  // ─── 1. Margin Score (max 40 points) ───
  let marginScore = 0;
  if (valuation && valuation.marginPct > 0) {
    // Scale: 0% margin = 0pts, 50%+ margin = 40pts
    marginScore = clamp(valuation.marginPct * 0.8, 0, SCORE_WEIGHTS.MARGIN);
  }

  // ─── 2. Rarity/Liquidity Score (max 20 points) ───
  let rarityScore = 0;
  if (catalogMatch) {
    const title = listing.title.toLowerCase();
    const setNums = catalogMatch.bricklinkNo.replace(/-1$/, '');

    // UCS sets are inherently high-value
    if (UCS_SETS[setNums]) rarityScore += 12;

    // Retired sets
    if (/retired|discontinued|auslauf/i.test(title)) rarityScore += 8;

    // Sealed/new items
    if (listing.condition === 'new') rarityScore += 5;

    // Known high-demand categories
    if (/clone|trooper|rex|cody|revan/i.test(title)) rarityScore += 5;

    rarityScore = clamp(rarityScore, 0, SCORE_WEIGHTS.RARITY);
  }

  // ─── 3. Confidence Score (max 20 points) ───
  let confidenceScore = 0;
  if (catalogMatch && valuation) {
    const avgConfidence = (catalogMatch.confidence + valuation.valuationConfidence) / 2;
    confidenceScore = clamp(avgConfidence * SCORE_WEIGHTS.CONFIDENCE, 0, SCORE_WEIGHTS.CONFIDENCE);
  }

  // ─── 4. Positive Terms Score (max 10 points) ───
  const positiveTerms = findKeywords(listing.title, POSITIVE_KEYWORDS);
  const positiveScore = clamp(positiveTerms.length * 2.5, 0, SCORE_WEIGHTS.POSITIVE_TERMS);

  // ─── 5. Speed/Urgency Score (max 10 points) ───
  let urgencyScore = 0;
  if (listing.buyingOption === 'FIXED_PRICE') urgencyScore += 3;
  if (listing.buyingOption === 'BEST_OFFER') urgencyScore += 5;
  // Auctions have natural urgency but less control
  if (listing.buyingOption === 'AUCTION') urgencyScore += 2;
  // Low price increases urgency
  if (valuation && valuation.marginPct > 30) urgencyScore += 5;
  urgencyScore = clamp(urgencyScore, 0, SCORE_WEIGHTS.URGENCY);

  // ─── 6. Risk Penalty (up to -50 points) ───
  const riskPenalty = clamp(risk.riskScore * 0.5, 0, SCORE_WEIGHTS.MAX_RISK_PENALTY);

  // ─── Calculate total ───
  const rawScore = marginScore + rarityScore + confidenceScore + positiveScore + urgencyScore;
  const dealScore = clamp(Math.round(rawScore - riskPenalty), 0, 100);

  // ─── Determine action ───
  const suggestedAction = getAction(dealScore, catalogMatch);

  const review: DealReview = {
    id: uuidv4(),
    listingId: listing.id,
    dealScore,
    riskScore: risk.riskScore,
    suggestedAction,
    aiSummary: '', // Populated by AI Review Service later
    riskSummary: risk.riskSummary,
    draftedMessage: '',
    approvedByUser: false,
    approvedAt: null,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  logger.debug(
    `Deal score for "${listing.title}": ${dealScore} ` +
    `(margin=${Math.round(marginScore)}, rarity=${Math.round(rarityScore)}, ` +
    `conf=${Math.round(confidenceScore)}, pos=${Math.round(positiveScore)}, ` +
    `urgency=${Math.round(urgencyScore)}, riskPenalty=-${Math.round(riskPenalty)})`
  );

  return review;
}

/**
 * Map deal score to suggested action.
 */
function getAction(dealScore: number, catalogMatch: CatalogMatch | null): SuggestedAction {
  // If catalog match confidence is very low, never suggest buy_review
  if (catalogMatch && catalogMatch.confidence < 0.75 && dealScore >= 80) {
    return 'ask_review'; // Downgrade to ask_review for low-confidence matches
  }

  if (dealScore >= DEAL_ACTIONS.BUY_REVIEW.min) return 'buy_review';
  if (dealScore >= DEAL_ACTIONS.ASK_REVIEW.min) return 'ask_review';
  if (dealScore >= DEAL_ACTIONS.WATCH.min) return 'watch';
  return 'ignore';
}
