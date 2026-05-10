import { v4 as uuidv4 } from 'uuid';
import { InMemoryStore } from '../repositories/inMemoryStore';
import type { SearchJob } from '../types';
import { logger } from '../utils/logger';

const SEED_JOBS: Omit<SearchJob, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt'>[] = [
  {
    marketplace: 'ebay',
    query: 'lego star wars minifigure',
    filters: { maxPrice: 100 },
    intervalMinutes: 60,
    active: true,
  },
  {
    marketplace: 'ebay',
    query: 'lego star wars clone trooper',
    filters: { maxPrice: 150 },
    intervalMinutes: 60,
    active: true,
  },
  {
    marketplace: 'ebay',
    query: 'lego star wars konvolut',
    filters: { maxPrice: 500 },
    intervalMinutes: 120,
    active: true,
  },
  {
    marketplace: 'ebay',
    query: 'lego krieg der sterne sammlung',
    filters: { maxPrice: 800 },
    intervalMinutes: 120,
    active: true,
  },
  {
    marketplace: 'ebay',
    query: 'lego star wars ucs',
    filters: { maxPrice: 1000 },
    intervalMinutes: 120,
    active: true,
  },
  {
    marketplace: 'ebay',
    query: 'lego starwars',
    filters: { maxPrice: 400 },
    intervalMinutes: 60,
    active: true,
  },
  {
    marketplace: 'ebay',
    query: 'leggo star wars',
    filters: { maxPrice: 300 },
    intervalMinutes: 120,
    active: true,
  },
];

export function seedDefaultJobs(): void {
  const store = InMemoryStore.getInstance();
  const existing = store.getSearchJobs();

  if (existing.length > 0) {
    logger.debug('Search jobs already exist, skipping seed');
    return;
  }

  const now = new Date().toISOString();
  for (const seed of SEED_JOBS) {
    store.addSearchJob({
      ...seed,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      lastRunAt: null,
    });
  }

  logger.info(`Seeded ${SEED_JOBS.length} default search jobs`);
}
