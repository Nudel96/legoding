import type { PipelineResult } from '../types';
import { logger } from '../utils/logger';

/**
 * BrickLink Wanted List XML Export.
 * Generates XML that can be uploaded to BrickLink's Want List feature.
 * Useful for tracking sets/minifigs identified as good deals.
 *
 * Format: https://www.bricklink.com/help.asp?helpID=207
 */

interface WantedItem {
  itemType: string;   // 'S' for Set, 'M' for Minifig, 'P' for Part
  itemId: string;     // BrickLink item number (e.g., '75192-1')
  color?: number;     // BrickLink color ID (0 for default)
  maxPrice?: number;  // Maximum price willing to pay
  minQty?: number;    // Minimum quantity
  condition?: 'N' | 'U' | 'X'; // New, Used, or Any
  notify?: 'Y' | 'N';
  remarks?: string;
}

/**
 * Convert pipeline results to BrickLink Wanted List XML.
 */
export function generateWantedListXml(
  results: PipelineResult[],
  options: {
    minScore?: number;
    listName?: string;
    includeMaxPrice?: boolean;
  } = {}
): string {
  const minScore = options.minScore ?? 40;
  const includeMaxPrice = options.includeMaxPrice ?? true;

  const qualifying = results.filter((r) => {
    if (r.dealReview.dealScore < minScore) return false;
    if (!r.catalogMatch?.bricklinkNo) return false;
    if (r.catalogMatch.itemType === 'LOT' || r.catalogMatch.itemType === 'UNKNOWN') return false;
    return true;
  });

  if (qualifying.length === 0) {
    logger.debug('No qualifying items for Wanted List export');
    return '<?xml version="1.0" encoding="UTF-8"?>\n<INVENTORY></INVENTORY>';
  }

  const items: WantedItem[] = qualifying.map((r) => {
    const blType = r.catalogMatch!.itemType === 'MINIFIG' ? 'M' : 'S';
    const blNo = r.catalogMatch!.bricklinkNo.replace(/-1$/, '');
    const condition = r.listing.condition === 'new' ? 'N' : 'U';

    return {
      itemType: blType,
      itemId: blNo,
      color: 0,
      maxPrice: includeMaxPrice && r.valuation
        ? Math.round(r.valuation.estimatedResaleValue * 0.6) // Max 60% of resale value
        : undefined,
      minQty: 1,
      condition,
      notify: 'Y',
      remarks: `Score:${r.dealReview.dealScore} | ${r.dealReview.suggestedAction} | via Deal Finder`,
    };
  });

  const xmlItems = items.map((item) => {
    const lines = [
      '  <ITEM>',
      `    <ITEMTYPE>${item.itemType}</ITEMTYPE>`,
      `    <ITEMID>${item.itemId}</ITEMID>`,
    ];

    if (item.color !== undefined) lines.push(`    <COLOR>${item.color}</COLOR>`);
    if (item.maxPrice !== undefined) lines.push(`    <MAXPRICE>${item.maxPrice.toFixed(2)}</MAXPRICE>`);
    if (item.minQty !== undefined) lines.push(`    <MINQTY>${item.minQty}</MINQTY>`);
    if (item.condition) lines.push(`    <CONDITION>${item.condition}</CONDITION>`);
    if (item.notify) lines.push(`    <NOTIFY>${item.notify}</NOTIFY>`);
    if (item.remarks) lines.push(`    <REMARKS>${escapeXml(item.remarks)}</REMARKS>`);

    lines.push('  </ITEM>');
    return lines.join('\n');
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<INVENTORY>',
    ...xmlItems,
    '</INVENTORY>',
  ].join('\n');

  logger.info(`Wanted List XML generated: ${items.length} items`);
  return xml;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
