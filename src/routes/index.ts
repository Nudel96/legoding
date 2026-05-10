import { Router, Request, Response } from 'express';
import { runAllJobs, runSingleJob } from '../services/searchJobService';
import { exportToSheets } from '../services/googleSheetsService';
import { notifyHighScoreDeals, buildTextSummary } from '../services/notificationService';
import { generateWantedListXml } from '../services/wantedListService';
import { InMemoryStore } from '../repositories/inMemoryStore';
import { logger } from '../utils/logger';

const store = InMemoryStore.getInstance();

export const healthRoutes = Router();
export const searchJobRoutes = Router();
export const listingRoutes = Router();
export const reviewRoutes = Router();
export const schedulerRoutes = Router();
export const exportRoutes = Router();

// ─── Health ───
healthRoutes.get('/health', (_req: Request, res: Response) => {
  const reviews = store.getDealReviews();
  const highScore = reviews.filter((r) => r.dealScore >= 60).length;
  res.json({
    status: 'ok',
    service: 'lego-deal-finder',
    timestamp: new Date().toISOString(),
    stats: {
      jobCount: store.getSearchJobs().length,
      listingCount: store.getListings().length,
      reviewCount: reviews.length,
      highScoreDeals: highScore,
      approvedDeals: reviews.filter((r) => r.approvedByUser).length,
    },
  });
});

// ─── Search Jobs ───
searchJobRoutes.get('/api/search-jobs', (_req: Request, res: Response) => {
  res.json(store.getSearchJobs());
});

searchJobRoutes.post('/api/search-jobs', (req: Request, res: Response) => {
  const { marketplace, query, filters, intervalMinutes, active } = req.body;

  if (!query) {
    res.status(400).json({ error: 'query is required' });
    return;
  }

  const { v4: uuidv4 } = require('uuid');
  const now = new Date().toISOString();
  const job = {
    id: uuidv4(),
    marketplace: marketplace || 'ebay',
    query,
    filters: filters || {},
    intervalMinutes: intervalMinutes || 60,
    active: active !== false,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
  };

  store.addSearchJob(job);
  res.status(201).json(job);
});

searchJobRoutes.patch('/api/search-jobs/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const job = store.getSearchJob(id);
  if (!job) {
    res.status(404).json({ error: 'Search job not found' });
    return;
  }
  store.updateSearchJob(id, req.body);
  res.json(store.getSearchJob(id));
});

searchJobRoutes.delete('/api/search-jobs/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const job = store.getSearchJob(id);
  if (!job) {
    res.status(404).json({ error: 'Search job not found' });
    return;
  }
  store.updateSearchJob(id, { active: false });
  res.json({ success: true, message: `Job "${job.query}" deactivated` });
});

// ─── Listings ───
listingRoutes.get('/api/listings', (req: Request, res: Response) => {
  const listings = store.getListings();
  const status = req.query.status as string | undefined;
  const filtered = status ? listings.filter((l) => l.status === status) : listings;
  res.json({ count: filtered.length, listings: filtered });
});

listingRoutes.get('/api/listings/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const listing = store.getListing(id);
  if (!listing) {
    res.status(404).json({ error: 'Listing not found' });
    return;
  }
  const catalogMatch = store.getCatalogMatchByListingId(id);
  const valuation = store.getValuationByListingId(id);
  res.json({ listing, catalogMatch: catalogMatch || null, valuation: valuation || null });
});

// ─── Reviews ───
reviewRoutes.get('/api/reviews', (req: Request, res: Response) => {
  const results = store.getPipelineResults();
  const minScore = parseInt(req.query.minScore as string) || 0;
  const action = req.query.action as string | undefined;
  const status = req.query.status as string | undefined;

  let filtered = results.filter((r) => r.dealReview.dealScore >= minScore);
  if (action) filtered = filtered.filter((r) => r.dealReview.suggestedAction === action);
  if (status) filtered = filtered.filter((r) => r.dealReview.status === status);

  res.json({ count: filtered.length, results: filtered });
});

reviewRoutes.get('/api/reviews/summary', (_req: Request, res: Response) => {
  const results = store.getPipelineResults();
  const summary = buildTextSummary(results, 40);
  res.json({
    totalReviews: results.length,
    byAction: {
      buy_review: results.filter((r) => r.dealReview.suggestedAction === 'buy_review').length,
      ask_review: results.filter((r) => r.dealReview.suggestedAction === 'ask_review').length,
      watch: results.filter((r) => r.dealReview.suggestedAction === 'watch').length,
      ignore: results.filter((r) => r.dealReview.suggestedAction === 'ignore').length,
    },
    byStatus: {
      pending: results.filter((r) => r.dealReview.status === 'pending').length,
      approved: results.filter((r) => r.dealReview.status === 'approved').length,
      rejected: results.filter((r) => r.dealReview.status === 'rejected').length,
    },
    textSummary: summary,
  });
});

reviewRoutes.patch('/api/reviews/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const review = store.getDealReview(id);
  if (!review) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }

  const { status, approvedByUser } = req.body;
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (approvedByUser !== undefined) {
    updates.approvedByUser = approvedByUser;
    if (approvedByUser) updates.approvedAt = new Date().toISOString();
  }

  store.updateDealReview(id, updates as any);
  res.json(store.getDealReview(id));
});

// ─── Scheduler ───
schedulerRoutes.post('/api/scheduler/run', async (_req: Request, res: Response) => {
  try {
    logger.info('Scheduler: running all active jobs');
    const result = await runAllJobs();
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Scheduler run failed', { error });
    res.status(500).json({ error: 'Scheduler run failed' });
  }
});

schedulerRoutes.post('/api/scheduler/run/:jobId', async (req: Request, res: Response) => {
  const jobId = req.params.jobId as string;
  const job = store.getSearchJob(jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  try {
    const results = await runSingleJob(job);
    store.updateSearchJob(job.id, { lastRunAt: new Date().toISOString() });
    res.json({ success: true, dealsFound: results.length });
  } catch (error) {
    logger.error(`Scheduler run for job ${job.id} failed`, { error });
    res.status(500).json({ error: 'Job run failed' });
  }
});

// ─── Exports ───
exportRoutes.get('/api/export/wanted-list', (req: Request, res: Response) => {
  const minScore = parseInt(req.query.minScore as string) || 40;
  const results = store.getPipelineResults();
  const xml = generateWantedListXml(results, { minScore });

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Content-Disposition', `attachment; filename="wanted-list-${Date.now()}.xml"`);
  res.send(xml);
});

exportRoutes.post('/api/export/sheets', async (req: Request, res: Response) => {
  const minScore = parseInt(req.body?.minScore as string) || 40;
  const results = store.getPipelineResults();

  try {
    const sheetsResult = await exportToSheets(results, { minScore });
    res.json({ success: true, ...sheetsResult });
  } catch (error) {
    logger.error('Manual sheets export failed', { error });
    res.status(500).json({ error: 'Sheets export failed' });
  }
});

exportRoutes.post('/api/export/notify', async (req: Request, res: Response) => {
  const minScore = parseInt(req.body?.minScore as string) || 60;
  const results = store.getPipelineResults();

  try {
    const notifResult = await notifyHighScoreDeals(results, { minScore });
    res.json({ success: true, ...notifResult });
  } catch (error) {
    logger.error('Manual notification failed', { error });
    res.status(500).json({ error: 'Notification failed' });
  }
});
