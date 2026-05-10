import { logger } from './logger';

/**
 * Retry a function with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, label = 'operation' } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        logger.error(`${label} failed after ${maxRetries} attempts`, { error });
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
      logger.warn(`${label} attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Unreachable');
}

/**
 * Simple rate limiter using a token bucket approach.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRateMs: number;

  constructor(maxRequestsPerSecond: number) {
    this.maxTokens = maxRequestsPerSecond;
    this.tokens = maxRequestsPerSecond;
    this.lastRefill = Date.now();
    this.refillRateMs = 1000 / maxRequestsPerSecond;
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens <= 0) {
      const waitMs = this.refillRateMs - (Date.now() - this.lastRefill);
      if (waitMs > 0) await sleep(waitMs);
      this.refill();
    }
    this.tokens--;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed / this.refillRateMs;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
