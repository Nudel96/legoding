import { google } from 'googleapis';
import type { PipelineResult } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Google Sheets Service — exports deal review data to a Google Sheet.
 * The sheet serves as the human-facing review queue and audit log.
 * 
 * Sheet structure:
 * | Timestamp | Title | Price | Marketplace | Type | BL No | Score | Risk | Action | Margin% | Resale | Confidence | Seller | Rating | URL | AI Summary | Drafted Message | Status |
 */

const SHEET_NAME = 'Deal Reviews';
const HEADER_ROW = [
  'Timestamp', 'Title', 'Price (€)', 'Shipping (€)', 'Total (€)',
  'Marketplace', 'Type', 'BrickLink No', 'Score', 'Risk Score',
  'Action', 'Margin %', 'Est. Resale (€)', 'Match Confidence',
  'Seller', 'Seller Rating', 'Location', 'Condition', 'Buying Option',
  'URL', 'Risk Summary', 'AI Summary', 'Drafted Message', 'Status',
];

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

/**
 * Initialize Google Sheets client using Application Default Credentials
 * or a service account key file.
 */
async function getSheetsClient(): Promise<ReturnType<typeof google.sheets>> {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

/**
 * Ensure the sheet has proper headers.
 * Creates the header row if the sheet is empty.
 */
async function ensureHeaders(sheets: ReturnType<typeof google.sheets>): Promise<void> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: env.googleSheetsSpreadsheetId,
      range: `${SHEET_NAME}!A1:X1`,
    });

    if (!response.data.values || response.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: env.googleSheetsSpreadsheetId,
        range: `${SHEET_NAME}!A1:X1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADER_ROW] },
      });
      logger.info('Google Sheets: header row created');

      // Format header row (bold, freeze)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: env.googleSheetsSpreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                  },
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor)',
              },
            },
            {
              updateSheetProperties: {
                properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
                fields: 'gridProperties.frozenRowCount',
              },
            },
          ],
        },
      });
    }
  } catch (error) {
    logger.warn('Google Sheets: could not verify headers', { error });
  }
}

/**
 * Convert a PipelineResult to a spreadsheet row.
 */
function resultToRow(result: PipelineResult): string[] {
  const { listing, catalogMatch, valuation, dealReview } = result;
  return [
    new Date().toISOString(),
    listing.title,
    listing.price.toFixed(2),
    listing.shipping.toFixed(2),
    listing.totalPrice.toFixed(2),
    listing.marketplace,
    catalogMatch?.itemType || 'UNKNOWN',
    catalogMatch?.bricklinkNo || '',
    dealReview.dealScore.toString(),
    dealReview.riskScore.toString(),
    dealReview.suggestedAction,
    valuation?.marginPct?.toFixed(1) || '0',
    valuation?.estimatedResaleValue?.toFixed(2) || '0',
    catalogMatch?.confidence?.toFixed(2) || '0',
    listing.sellerName,
    listing.sellerRating?.toString() || '',
    listing.location,
    listing.condition,
    listing.buyingOption,
    listing.url,
    dealReview.riskSummary,
    dealReview.aiSummary,
    dealReview.draftedMessage,
    dealReview.status,
  ];
}

/**
 * Export pipeline results to Google Sheets.
 * Only exports results meeting the minimum deal score threshold.
 */
export async function exportToSheets(
  results: PipelineResult[],
  options: { minScore?: number } = {}
): Promise<{ exported: number; skipped: number }> {
  if (!env.hasGoogleSheets) {
    logger.debug('Google Sheets not configured — skipping export');
    return { exported: 0, skipped: results.length };
  }

  const minScore = options.minScore ?? 0;
  const qualifying = results.filter((r) => r.dealReview.dealScore >= minScore);

  if (qualifying.length === 0) {
    logger.debug('No qualifying deals to export to Sheets');
    return { exported: 0, skipped: results.length };
  }

  try {
    const sheets = await getSheetsClient();
    await ensureHeaders(sheets);

    const rows = qualifying.map(resultToRow);

    await sheets.spreadsheets.values.append({
      spreadsheetId: env.googleSheetsSpreadsheetId,
      range: `${SHEET_NAME}!A:X`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    });

    // Apply conditional formatting for high-score deals
    await applyConditionalFormatting(sheets);

    logger.info(`Google Sheets: exported ${qualifying.length} deals`);
    return { exported: qualifying.length, skipped: results.length - qualifying.length };
  } catch (error) {
    logger.error('Google Sheets export failed', { error });
    return { exported: 0, skipped: results.length };
  }
}

/**
 * Apply conditional formatting to highlight high-score deals and risks.
 */
async function applyConditionalFormatting(sheets: ReturnType<typeof google.sheets>): Promise<void> {
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: env.googleSheetsSpreadsheetId,
      requestBody: {
        requests: [
          // Score >= 80 → green background
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [{ sheetId: 0, startRowIndex: 1, startColumnIndex: 8, endColumnIndex: 9 }],
                booleanRule: {
                  condition: {
                    type: 'NUMBER_GREATER_THAN_EQ',
                    values: [{ userEnteredValue: '80' }],
                  },
                  format: { backgroundColor: { red: 0.2, green: 0.8, blue: 0.2 } },
                },
              },
              index: 0,
            },
          },
          // Score 60-79 → yellow background
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [{ sheetId: 0, startRowIndex: 1, startColumnIndex: 8, endColumnIndex: 9 }],
                booleanRule: {
                  condition: {
                    type: 'NUMBER_GREATER_THAN_EQ',
                    values: [{ userEnteredValue: '60' }],
                  },
                  format: { backgroundColor: { red: 1.0, green: 0.85, blue: 0.2 } },
                },
              },
              index: 1,
            },
          },
          // Risk >= 50 → red background on risk column
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [{ sheetId: 0, startRowIndex: 1, startColumnIndex: 9, endColumnIndex: 10 }],
                booleanRule: {
                  condition: {
                    type: 'NUMBER_GREATER_THAN_EQ',
                    values: [{ userEnteredValue: '50' }],
                  },
                  format: { backgroundColor: { red: 0.9, green: 0.2, blue: 0.2 } },
                },
              },
              index: 2,
            },
          },
        ],
      },
    });
  } catch {
    // Formatting is nice-to-have, don't fail the export
    logger.debug('Conditional formatting could not be applied (may already exist)');
  }
}

/**
 * Update a row's status column in the sheet (e.g., when a deal is approved/rejected).
 */
export async function updateSheetStatus(
  listingTitle: string,
  newStatus: string
): Promise<boolean> {
  if (!env.hasGoogleSheets) return false;

  try {
    const sheets = await getSheetsClient();

    // Find the row by title
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: env.googleSheetsSpreadsheetId,
      range: `${SHEET_NAME}!B:X`,
    });

    const rows = response.data.values || [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === listingTitle) {
        // Update status column (column X = index 23, row = i + 1 for 1-indexed)
        await sheets.spreadsheets.values.update({
          spreadsheetId: env.googleSheetsSpreadsheetId,
          range: `${SHEET_NAME}!X${i + 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[newStatus]] },
        });
        logger.info(`Google Sheets: updated status for "${listingTitle}" → ${newStatus}`);
        return true;
      }
    }

    logger.warn(`Google Sheets: listing "${listingTitle}" not found for status update`);
    return false;
  } catch (error) {
    logger.error('Google Sheets status update failed', { error });
    return false;
  }
}
