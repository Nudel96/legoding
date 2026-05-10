import type { Listing, CatalogMatch, Valuation, DealReview, AiReviewResult, SuggestedAction } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';

/**
 * AI Review Service — uses Gemini to produce structured review of a deal.
 * Falls back to mock when no API key is configured.
 */
export async function aiReview(
  listing: Listing,
  catalogMatch: CatalogMatch | null,
  valuation: Valuation | null,
  dealReview: DealReview
): Promise<AiReviewResult> {
  if (!env.hasGeminiKey) {
    return mockAiReview(listing, catalogMatch, valuation, dealReview);
  }

  try {
    return await withRetry(
      () => callGemini(listing, catalogMatch, valuation, dealReview),
      { label: 'Gemini AI Review', maxRetries: 2 }
    );
  } catch (error) {
    logger.warn('Gemini AI Review failed, using mock', { error });
    return mockAiReview(listing, catalogMatch, valuation, dealReview);
  }
}

async function callGemini(
  listing: Listing,
  catalogMatch: CatalogMatch | null,
  valuation: Valuation | null,
  dealReview: DealReview
): Promise<AiReviewResult> {
  const systemPrompt = `You are a LEGO Star Wars deal evaluation assistant. Analyze the listing and provide a structured assessment.

RULES:
- Never suggest off-platform payment
- Never include email/phone in drafted messages
- Never write manipulative seller texts
- Keep drafted messages short, polite, and platform-compliant
- Goal: confirm condition, completeness, express purchase interest via platform
- Respond in JSON format only`;

  const userPrompt = `Analyze this listing:
Title: ${listing.title}
Price: ${listing.totalPrice} ${listing.currency}
Condition: ${listing.condition}
Marketplace: ${listing.marketplace}
Catalog Match: ${catalogMatch ? `${catalogMatch.itemType} ${catalogMatch.bricklinkNo} (confidence: ${catalogMatch.confidence})` : 'None'}
Estimated Resale: ${valuation?.estimatedResaleValue || 'Unknown'}
Margin: ${valuation?.marginPct || 0}%
Risk Score: ${dealReview.riskScore}
Deal Score: ${dealReview.dealScore}

Return JSON with: aiSummary, whatItProbablyIs, reasonForOpportunity, riskSummary, suggestedAction (buy_review|ask_review|watch|ignore), draftedMessage (German, polite, platform-compliant), confidence (0-1), complianceFlags (array)`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
        ],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const parsed = JSON.parse(text);

  return {
    aiSummary: parsed.aiSummary || '',
    whatItProbablyIs: parsed.whatItProbablyIs || '',
    reasonForOpportunity: parsed.reasonForOpportunity || '',
    riskSummary: parsed.riskSummary || dealReview.riskSummary,
    suggestedAction: parsed.suggestedAction || dealReview.suggestedAction,
    draftedMessage: parsed.draftedMessage || '',
    confidence: parsed.confidence || 0.5,
    complianceFlags: parsed.complianceFlags || [],
  };
}

function mockAiReview(
  listing: Listing,
  catalogMatch: CatalogMatch | null,
  valuation: Valuation | null,
  dealReview: DealReview
): AiReviewResult {
  const itemDesc = catalogMatch
    ? `${catalogMatch.itemType} ${catalogMatch.bricklinkNo}`
    : 'unidentified LEGO item';

  return {
    aiSummary: `[MOCK] Listing appears to be ${itemDesc}. Price: ${listing.totalPrice} EUR.`,
    whatItProbablyIs: itemDesc,
    reasonForOpportunity: valuation && valuation.marginPct > 0
      ? `Potential ${valuation.marginPct.toFixed(0)}% margin based on BrickLink data`
      : 'Unable to determine opportunity without valuation data',
    riskSummary: dealReview.riskSummary,
    suggestedAction: dealReview.suggestedAction,
    draftedMessage: 'Hallo, ich interessiere mich für das LEGO-Star-Wars-Angebot. Könnten Sie kurz bestätigen, ob alle Figuren und Teile enthalten sind und ob der Zustand den Fotos entspricht? Wenn ja, würde ich das Angebot gerne direkt über die Plattform kaufen. Viele Grüße',
    confidence: 0.5,
    complianceFlags: ['mock_review'],
  };
}
