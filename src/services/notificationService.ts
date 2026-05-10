import type { PipelineResult } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export type NotificationChannel = 'google_chat' | 'gmail' | 'log' | 'none';

interface DealSummary {
  title: string;
  score: number;
  riskScore: number;
  action: string;
  price: string;
  margin: string;
  type: string;
  url: string;
}

interface NotificationPayload {
  title: string;
  deals: DealSummary[];
  totalDeals: number;
  timestamp: string;
}

function buildPayload(results: PipelineResult[]): NotificationPayload {
  return {
    title: `🧱 ${results.length} neue LEGO Deal${results.length > 1 ? 's' : ''} gefunden!`,
    deals: results.map((r) => ({
      title: r.listing.title.substring(0, 80),
      score: r.dealReview.dealScore,
      riskScore: r.dealReview.riskScore,
      action: r.dealReview.suggestedAction,
      price: `${r.listing.totalPrice.toFixed(2)} ${r.listing.currency}`,
      margin: r.valuation ? `${r.valuation.marginPct.toFixed(0)}%` : 'N/A',
      type: r.catalogMatch?.itemType || 'UNKNOWN',
      url: r.listing.url,
    })),
    totalDeals: results.length,
    timestamp: new Date().toISOString(),
  };
}

function logHighScoreDeals(payload: NotificationPayload): void {
  logger.info(`🚀 ${payload.title}`);
  for (const deal of payload.deals) {
    logger.info(
      `  ⭐ Score ${deal.score} | ${deal.action} | ${deal.price} | ${deal.margin} margin | ${deal.type} | ${deal.title}`
    );
  }
}

async function sendGoogleChat(payload: NotificationPayload): Promise<void> {
  if (!env.googleChatWebhookUrl) {
    logger.warn('Google Chat webhook URL not configured');
    return;
  }

  const sections = payload.deals.map((deal) => ({
    widgets: [{
      decoratedText: {
        topLabel: `Score: ${deal.score} | Risk: ${deal.riskScore} | ${deal.action.toUpperCase()}`,
        text: deal.title,
        bottomLabel: `${deal.price} → ${deal.margin} Margin | ${deal.type}`,
        button: { text: 'Ansehen', onClick: { openLink: { url: deal.url } } },
      },
    }],
  }));

  const message = {
    cardsV2: [{
      cardId: `deal-alert-${Date.now()}`,
      card: {
        header: { title: payload.title, subtitle: payload.timestamp, imageUrl: 'https://www.lego.com/favicon.ico', imageType: 'CIRCLE' },
        sections,
      },
    }],
  };

  try {
    const response = await fetch(env.googleChatWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!response.ok) {
      logger.error(`Google Chat notification failed: ${response.status}`);
    } else {
      logger.info(`Google Chat notification sent: ${payload.deals.length} deals`);
    }
  } catch (error) {
    logger.error('Google Chat notification error', { error });
  }
}

export async function notifyHighScoreDeals(
  results: PipelineResult[],
  options: { minScore?: number; channel?: NotificationChannel } = {}
): Promise<{ sent: boolean; channel: string; dealCount: number }> {
  const minScore = options.minScore ?? env.minDealScoreNotify;
  const channel = options.channel ?? (env.notificationMode as NotificationChannel) ?? 'none';
  const qualifying = results.filter((r) => r.dealReview.dealScore >= minScore);

  if (qualifying.length === 0) {
    return { sent: false, channel, dealCount: 0 };
  }

  const payload = buildPayload(qualifying);
  logHighScoreDeals(payload);

  if (channel === 'google_chat') await sendGoogleChat(payload);

  return { sent: channel !== 'none', channel, dealCount: qualifying.length };
}

export function buildTextSummary(results: PipelineResult[], minScore = 0): string {
  const q = results.filter((r) => r.dealReview.dealScore >= minScore);
  if (q.length === 0) return 'Keine qualifizierten Deals gefunden.';
  const lines = q.map((r) =>
    `Score: ${r.dealReview.dealScore} | ${r.dealReview.suggestedAction} | ${r.listing.totalPrice.toFixed(2)}€ | ${r.catalogMatch?.itemType || '?'} | ${r.listing.title.substring(0, 60)}`
  );
  return `🧱 ${q.length} Deal(s):\n${lines.join('\n')}`;
}
