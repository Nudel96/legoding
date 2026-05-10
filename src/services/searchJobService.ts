import type { Listing, CatalogMatch, Valuation, DealReview, SearchJob, PipelineResult } from '../types';
import { searchEbay } from '../connectors/ebayConnector';
import { normalizeAndDedup } from './listingNormalizer';
import { matchListing } from './catalogMatcher';
import { assessRisk } from './riskDetectionService';
import { valuateListing } from './valuationService';
import { scoreDeal } from './dealScoringService';
import { aiReview } from './aiReviewService';
import { exportToSheets } from './googleSheetsService';
import { notifyHighScoreDeals } from './notificationService';
import { InMemoryStore } from '../repositories/inMemoryStore';
import { logger } from '../utils/logger';

const store = InMemoryStore.getInstance();

/**
 * Run all active search jobs through the full pipeline.
 */
export async function runAllJobs(): Promise<{
  jobsRun: number;
  dealsFound: number;
  sheetsExported: number;
  notificationsSent: number;
}> {
  const jobs = store.getSearchJobs().filter((j) => j.active);
  logger.info(`Running ${jobs.length} active search jobs`);

  let totalDeals = 0;
  const allResults: PipelineResult[] = [];

  for (const job of jobs) {
    try {
      const results = await runSingleJob(job);
      totalDeals += results.length;
      allResults.push(...results);
      store.updateSearchJob(job.id, { lastRunAt: new Date().toISOString() });
    } catch (error) {
      logger.error(`Job ${job.id} ("${job.query}") failed`, { error });
    }
  }

  // Post-pipeline: export to Sheets & send notifications
  let sheetsExported = 0;
  let notificationsSent = 0;

  if (allResults.length > 0) {
    try {
      const sheetsResult = await exportToSheets(allResults, { minScore: 40 });
      sheetsExported = sheetsResult.exported;
    } catch (error) {
      logger.error('Sheets export failed (non-blocking)', { error });
    }

    try {
      const notifResult = await notifyHighScoreDeals(allResults);
      notificationsSent = notifResult.dealCount;
    } catch (error) {
      logger.error('Notification failed (non-blocking)', { error });
    }
  }

  return { jobsRun: jobs.length, dealsFound: totalDeals, sheetsExported, notificationsSent };
}

/**
 * Run a single search job through the full pipeline.
 */
export async function runSingleJob(job: SearchJob): Promise<PipelineResult[]> {
  logger.info(`Running job: "${job.query}" on ${job.marketplace}`);

  // Step 1: Search marketplace
  const rawResults = await searchEbay(job.query, job.filters);

  // Step 2: Normalize and deduplicate
  const existingHashes = new Set(store.getListings().map((l) => l.rawDataHash));
  const { listings, duplicateCount } = normalizeAndDedup(rawResults, existingHashes);

  logger.info(`Job "${job.query}": ${listings.length} new, ${duplicateCount} duplicates`);

  // Step 3–6: Process each listing through the pipeline
  const results: PipelineResult[] = [];

  for (const listing of listings) {
    try {
      const result = await processListing(listing);
      results.push(result);

      // Store in memory
      store.addListing(result.listing);
      if (result.catalogMatch) store.addCatalogMatch(result.catalogMatch);
      if (result.valuation) store.addValuation(result.valuation);
      store.addDealReview(result.dealReview);
    } catch (error) {
      logger.error(`Failed to process listing "${listing.title}"`, { error });
    }
  }

  // Log summary
  const highScoreDeals = results.filter((r) => r.dealReview.dealScore >= 60);
  logger.info(
    `Job "${job.query}" complete: ${results.length} processed, ` +
    `${highScoreDeals.length} high-score deals`
  );

  return results;
}

/**
 * Process a single listing through the full evaluation pipeline.
 */
async function processListing(listing: Listing): Promise<PipelineResult> {
  // Step 3: Catalog matching
  const catalogMatch = matchListing(listing);

  // Step 4: Risk detection
  const risk = assessRisk(listing);

  // Step 5: Valuation
  const valuation = await valuateListing(listing, catalogMatch);

  // Step 6: Deal scoring
  const dealReview = scoreDeal(listing, catalogMatch, valuation, risk);

  // Step 7: AI Review (optional, for high-scoring deals)
  if (dealReview.dealScore >= 40) {
    const aiResult = await aiReview(listing, catalogMatch, valuation, dealReview);
    dealReview.aiSummary = aiResult.aiSummary;
    dealReview.draftedMessage = aiResult.draftedMessage;
    if (aiResult.riskSummary) dealReview.riskSummary = aiResult.riskSummary;
  }

  return { listing, catalogMatch, valuation, dealReview };
}
