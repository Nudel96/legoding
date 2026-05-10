import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // Google Cloud
  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || '',
  firestoreDatabase: process.env.FIRESTORE_DATABASE || '',
  googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  googleSheetsSpreadsheetId: process.env.GOOGLE_SHEETS_REVIEW_SPREADSHEET_ID || '',

  // eBay
  ebayClientId: process.env.EBAY_CLIENT_ID || '',
  ebayClientSecret: process.env.EBAY_CLIENT_SECRET || '',
  ebayMarketplaceId: process.env.EBAY_MARKETPLACE_ID || 'EBAY_DE',
  ebayBaseUrl: process.env.EBAY_BASE_URL || 'https://api.ebay.com',

  // BrickLink
  bricklinkConsumerKey: process.env.BRICKLINK_CONSUMER_KEY || '',
  bricklinkConsumerSecret: process.env.BRICKLINK_CONSUMER_SECRET || '',
  bricklinkTokenValue: process.env.BRICKLINK_TOKEN_VALUE || '',
  bricklinkTokenSecret: process.env.BRICKLINK_TOKEN_SECRET || '',

  // Rebrickable
  rebrickableApiKey: process.env.REBRICKABLE_API_KEY || '',

  // Gemini
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',

  // Notifications
  notificationMode: process.env.NOTIFICATION_MODE || 'none',
  googleChatWebhookUrl: process.env.GOOGLE_CHAT_WEBHOOK_URL || '',
  gmailNotificationTo: process.env.GMAIL_NOTIFICATION_TO || '',

  // Deal Scoring
  minDealScoreNotify: parseInt(process.env.MIN_DEAL_SCORE_NOTIFY || '80', 10),
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'EUR',
  defaultRegion: process.env.DEFAULT_REGION || 'EU',
  defaultCountry: process.env.DEFAULT_COUNTRY || 'DE',

  // Derived: check if real API keys are configured
  hasEbayKeys: !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET),
  hasBricklinkKeys: !!(process.env.BRICKLINK_CONSUMER_KEY && process.env.BRICKLINK_CONSUMER_SECRET),
  hasRebrickableKey: !!process.env.REBRICKABLE_API_KEY,
  hasGeminiKey: !!process.env.GEMINI_API_KEY,
  hasFirestore: !!process.env.GOOGLE_CLOUD_PROJECT,
  hasGoogleSheets: !!process.env.GOOGLE_SHEETS_REVIEW_SPREADSHEET_ID,
};
