import express from 'express';
import { env } from './config/env';
import { logger } from './utils/logger';
import {
  healthRoutes,
  searchJobRoutes,
  listingRoutes,
  reviewRoutes,
  schedulerRoutes,
  exportRoutes,
} from './routes';
import { seedDefaultJobs } from './scripts/seedSearchJobs';

const app = express();

app.use(express.json());
app.use(express.static('public')); // Serve frontend dashboard

// Register routes
app.use(healthRoutes);
app.use(searchJobRoutes);
app.use(listingRoutes);
app.use(reviewRoutes);
app.use(schedulerRoutes);
app.use(exportRoutes);

// Seed default search jobs on startup
seedDefaultJobs();

app.listen(env.port, () => {
  logger.info(`🧱 LEGO Deal Finder running on port ${env.port}`);
  logger.info(`Environment: ${env.nodeEnv}`);
  logger.info(`eBay API: ${env.hasEbayKeys ? 'configured' : 'MOCK MODE'}`);
  logger.info(`BrickLink API: ${env.hasBricklinkKeys ? 'configured' : 'MOCK MODE'}`);
  logger.info(`Gemini AI: ${env.hasGeminiKey ? 'configured' : 'MOCK MODE'}`);
  logger.info(`Firestore: ${env.hasFirestore ? 'configured' : 'IN-MEMORY MODE'}`);
  logger.info(`Google Sheets: ${env.hasGoogleSheets ? 'configured' : 'DISABLED'}`);
  logger.info(`Notifications: ${env.notificationMode || 'none'}`);
});

export default app;
