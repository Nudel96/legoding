import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { withRetry, RateLimiter } from '../utils/retry';
import type { BricklinkPriceGuide, BricklinkCatalogItem } from '../types';

const rateLimiter = new RateLimiter(1); // BrickLink is more restrictive
const BRICKLINK_API_BASE = 'https://api.bricklink.com/api/store/v1';

/**
 * Generate OAuth 1.0a signature for BrickLink API.
 */
function generateOAuthHeader(method: string, url: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');

  const params: Record<string, string> = {
    oauth_consumer_key: env.bricklinkConsumerKey,
    oauth_token: env.bricklinkTokenValue,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
  };

  // Parse URL to extract query params
  const urlObj = new URL(url);
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Sort and encode
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map((k) => `${encodeRFC3986(k)}=${encodeRFC3986(params[k])}`).join('&');

  const baseString = [
    method.toUpperCase(),
    encodeRFC3986(urlObj.origin + urlObj.pathname),
    encodeRFC3986(paramString),
  ].join('&');

  const signingKey = `${encodeRFC3986(env.bricklinkConsumerSecret)}&${encodeRFC3986(env.bricklinkTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  params['oauth_signature'] = signature;

  const authHeader = Object.keys(params)
    .filter((k) => k.startsWith('oauth_'))
    .sort()
    .map((k) => `${encodeRFC3986(k)}="${encodeRFC3986(params[k])}"`)
    .join(', ');

  return `OAuth ${authHeader}`;
}

function encodeRFC3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * Make a signed request to BrickLink API.
 */
async function bricklinkRequest<T>(endpoint: string): Promise<T> {
  if (!env.hasBricklinkKeys) {
    throw new Error('BrickLink API keys not configured');
  }

  await rateLimiter.acquire();
  const url = `${BRICKLINK_API_BASE}${endpoint}`;
  const authHeader = generateOAuthHeader('GET', url);

  const response = await fetch(url, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`BrickLink API error: ${response.status} — ${text}`);
  }

  const result = (await response.json()) as { meta?: { code: number; message?: string }; data: T };

  if (result.meta?.code !== 200) {
    throw new Error(`BrickLink API error: ${result.meta?.message || 'Unknown'}`);
  }

  return result.data;
}

/**
 * Get catalog item details from BrickLink.
 */
export async function getCatalogItem(
  type: string,
  no: string
): Promise<BricklinkCatalogItem | null> {
  if (!env.hasBricklinkKeys) {
    logger.debug(`BrickLink mock: getCatalogItem(${type}, ${no})`);
    return getMockCatalogItem(type, no);
  }

  try {
    return await withRetry(
      () => bricklinkRequest<BricklinkCatalogItem>(`/items/${type}/${no}`),
      { label: `BrickLink getCatalogItem(${type}, ${no})`, maxRetries: 2 }
    );
  } catch (error) {
    logger.warn(`BrickLink getCatalogItem failed for ${type}/${no}`, { error });
    return null;
  }
}

/**
 * Get price guide from BrickLink.
 */
export async function getPriceGuide(
  type: string,
  no: string,
  options: {
    newOrUsed?: 'N' | 'U';
    guideType?: 'sold' | 'stock';
    region?: string;
    currencyCode?: string;
  } = {}
): Promise<BricklinkPriceGuide | null> {
  if (!env.hasBricklinkKeys) {
    logger.debug(`BrickLink mock: getPriceGuide(${type}, ${no})`);
    return getMockPriceGuide(type, no, options.newOrUsed || 'U');
  }

  const {
    newOrUsed = 'U',
    guideType = 'sold',
    region = env.defaultRegion.toLowerCase(),
    currencyCode = env.defaultCurrency,
  } = options;

  const params = new URLSearchParams({
    new_or_used: newOrUsed,
    guide_type: guideType,
    region,
    currency_code: currencyCode,
  });

  try {
    return await withRetry(
      () => bricklinkRequest<BricklinkPriceGuide>(`/items/${type}/${no}/price?${params}`),
      { label: `BrickLink getPriceGuide(${type}, ${no})`, maxRetries: 2 }
    );
  } catch (error) {
    logger.warn(`BrickLink getPriceGuide failed for ${type}/${no}`, { error });
    return null;
  }
}

// ─── Mock Data ───

function getMockCatalogItem(type: string, no: string): BricklinkCatalogItem | null {
  const mockItems: Record<string, BricklinkCatalogItem> = {
    'S-75192': {
      no: '75192-1', name: 'Millennium Falcon', type: 'S',
      category_id: 65, image_url: '', thumbnail_url: '',
      weight: '0', dim_x: '0', dim_y: '0', dim_z: '0',
      year_released: 2017, is_obsolete: false,
    },
    'S-75280': {
      no: '75280-1', name: '501st Legion Clone Troopers', type: 'S',
      category_id: 65, image_url: '', thumbnail_url: '',
      weight: '0', dim_x: '0', dim_y: '0', dim_z: '0',
      year_released: 2020, is_obsolete: true,
    },
    'S-75313': {
      no: '75313-1', name: 'AT-AT', type: 'S',
      category_id: 65, image_url: '', thumbnail_url: '',
      weight: '0', dim_x: '0', dim_y: '0', dim_z: '0',
      year_released: 2021, is_obsolete: false,
    },
  };
  return mockItems[`${type}-${no}`] || null;
}

function getMockPriceGuide(type: string, no: string, condition: string): BricklinkPriceGuide | null {
  const mockPrices: Record<string, { avg: string; min: string }> = {
    'S-75192-U': { avg: '750.00', min: '680.00' },
    'S-75192-N': { avg: '950.00', min: '850.00' },
    'S-75280-U': { avg: '55.00', min: '40.00' },
    'S-75280-N': { avg: '75.00', min: '60.00' },
    'S-75313-U': { avg: '720.00', min: '650.00' },
    'S-75313-N': { avg: '900.00', min: '800.00' },
    'M-sw0450-U': { avg: '85.00', min: '60.00' },
    'M-sw0450-N': { avg: '120.00', min: '95.00' },
  };

  const key = `${type}-${no}-${condition}`;
  const prices = mockPrices[key];
  if (!prices) return null;

  return {
    item: { no, type },
    new_or_used: condition,
    currency_code: 'EUR',
    min_price: prices.min,
    max_price: String(parseFloat(prices.avg) * 1.5),
    avg_price: prices.avg,
    qty_avg_price: prices.avg,
    unit_quantity: 10,
    total_quantity: 50,
    price_detail: [],
  };
}
