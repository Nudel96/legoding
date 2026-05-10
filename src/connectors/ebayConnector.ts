import { env } from '../config/env';
import { logger } from '../utils/logger';
import { withRetry, RateLimiter } from '../utils/retry';
import type { EbaySearchResult, SearchFilters } from '../types';

const rateLimiter = new RateLimiter(5); // 5 requests per second

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get an OAuth2 application token for eBay Browse API.
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${env.ebayClientId}:${env.ebayClientSecret}`).toString('base64');

  const response = await fetch(`${env.ebayBaseUrl}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`eBay OAuth failed: ${response.status} — ${text}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  logger.info('eBay OAuth token acquired');
  return cachedToken.token;
}

/**
 * Search eBay Browse API for listings.
 */
export async function searchEbay(
  query: string,
  filters: SearchFilters = {}
): Promise<EbaySearchResult[]> {
  if (!env.hasEbayKeys) {
    logger.info('eBay keys not configured — using mock data');
    return getMockEbayResults(query);
  }

  await rateLimiter.acquire();

  const token = await withRetry(() => getAccessToken(), { label: 'eBay OAuth', maxRetries: 3 });

  const params = new URLSearchParams();
  params.set('q', query);
  params.set('limit', String(filters.limit || 50));
  if (filters.offset) params.set('offset', String(filters.offset));

  // Build filter string
  const filterParts: string[] = [];
  if (filters.maxPrice) filterParts.push(`price:[..${filters.maxPrice}],priceCurrency:EUR`);
  if (filters.minPrice) filterParts.push(`price:[${filters.minPrice}..],priceCurrency:EUR`);
  if (filters.buyingOptions?.length) {
    filterParts.push(`buyingOptions:{${filters.buyingOptions.join('|')}}`);
  }
  if (filterParts.length) params.set('filter', filterParts.join(','));

  const url = `${env.ebayBaseUrl}/buy/browse/v1/item_summary/search?${params.toString()}`;

  const response = await withRetry(
    async () => {
      await rateLimiter.acquire();
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': env.ebayMarketplaceId,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`eBay search failed: ${res.status} — ${text}`);
      }
      return res;
    },
    { label: 'eBay Browse Search', maxRetries: 3 }
  );

  const data = (await response.json()) as { itemSummaries?: EbaySearchResult[] };
  const items: EbaySearchResult[] = data.itemSummaries || [];
  logger.info(`eBay search for "${query}" returned ${items.length} results`);
  return items;
}

/** Mock data for development without API keys */
function getMockEbayResults(query: string): EbaySearchResult[] {
  return [
    {
      itemId: 'v1|MOCK001|0',
      title: 'LEGO Star Wars 75192 Millennium Falcon UCS - SEALED',
      itemWebUrl: 'https://www.ebay.de/itm/MOCK001',
      image: { imageUrl: 'https://via.placeholder.com/300' },
      price: { value: '649.99', currency: 'EUR' },
      shippingOptions: [{ shippingCostType: 'FIXED', shippingCost: { value: '0.00', currency: 'EUR' } }],
      seller: { username: 'lego_seller_01', feedbackPercentage: '99.5', feedbackScore: 1234 },
      condition: 'New',
      conditionId: '1000',
      itemLocation: { country: 'DE' },
      buyingOptions: ['FIXED_PRICE'],
    },
    {
      itemId: 'v1|MOCK002|0',
      title: 'Lego Starwars Konvolut Clone Trooper Figuren Sammlung',
      itemWebUrl: 'https://www.ebay.de/itm/MOCK002',
      image: { imageUrl: 'https://via.placeholder.com/300' },
      price: { value: '45.00', currency: 'EUR' },
      shippingOptions: [{ shippingCostType: 'FIXED', shippingCost: { value: '5.99', currency: 'EUR' } }],
      seller: { username: 'sammler_de', feedbackPercentage: '98.0', feedbackScore: 456 },
      condition: 'Used',
      conditionId: '3000',
      itemLocation: { country: 'DE' },
      buyingOptions: ['FIXED_PRICE'],
    },
    {
      itemId: 'v1|MOCK003|0',
      title: 'leggo star wars Captain Rex Figur sw0450 selten rare',
      itemWebUrl: 'https://www.ebay.de/itm/MOCK003',
      image: { imageUrl: 'https://via.placeholder.com/300' },
      price: { value: '25.00', currency: 'EUR' },
      shippingOptions: [{ shippingCostType: 'FIXED', shippingCost: { value: '2.50', currency: 'EUR' } }],
      seller: { username: 'brick_deals', feedbackPercentage: '97.0', feedbackScore: 200 },
      condition: 'Used',
      conditionId: '3000',
      itemLocation: { country: 'DE' },
      buyingOptions: ['FIXED_PRICE', 'BEST_OFFER'],
    },
    {
      itemId: 'v1|MOCK004|0',
      title: 'LEGO Star Wars 75280 501st Legion Clone Troopers - NEU OVP',
      itemWebUrl: 'https://www.ebay.de/itm/MOCK004',
      image: { imageUrl: 'https://via.placeholder.com/300' },
      price: { value: '35.00', currency: 'EUR' },
      shippingOptions: [{ shippingCostType: 'FIXED', shippingCost: { value: '4.99', currency: 'EUR' } }],
      seller: { username: 'toylover99', feedbackPercentage: '100.0', feedbackScore: 89 },
      condition: 'New',
      conditionId: '1000',
      itemLocation: { country: 'DE' },
      buyingOptions: ['FIXED_PRICE'],
    },
    {
      itemId: 'v1|MOCK005|0',
      title: 'LEGO kompatibel Star Wars Custom Clone Trooper - NOT ORIGINAL',
      itemWebUrl: 'https://www.ebay.de/itm/MOCK005',
      image: { imageUrl: 'https://via.placeholder.com/300' },
      price: { value: '8.99', currency: 'EUR' },
      shippingOptions: [{ shippingCostType: 'FIXED', shippingCost: { value: '1.50', currency: 'EUR' } }],
      seller: { username: 'china_bricks', feedbackPercentage: '92.0', feedbackScore: 50 },
      condition: 'New',
      conditionId: '1000',
      itemLocation: { country: 'CN' },
      buyingOptions: ['FIXED_PRICE'],
    },
    {
      itemId: 'v1|MOCK006|0',
      title: 'LEGO Star Wars 75313 AT-AT UCS - versiegelt ungeöffnet',
      itemWebUrl: 'https://www.ebay.de/itm/MOCK006',
      image: { imageUrl: 'https://via.placeholder.com/300' },
      price: { value: '699.00', currency: 'EUR' },
      shippingOptions: [{ shippingCostType: 'FIXED', shippingCost: { value: '0.00', currency: 'EUR' } }],
      seller: { username: 'premium_lego', feedbackPercentage: '99.9', feedbackScore: 5000 },
      condition: 'New',
      conditionId: '1000',
      itemLocation: { country: 'DE' },
      buyingOptions: ['FIXED_PRICE'],
    },
  ];
}
