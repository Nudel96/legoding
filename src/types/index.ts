// ─── Listing ───
export type Marketplace = 'ebay' | 'bricklink';
export type ListingStatus = 'new' | 'reviewed' | 'watched' | 'ignored' | 'expired' | 'bought';
export type ListingCondition = 'new' | 'used' | 'unspecified';
export type BuyingOption = 'FIXED_PRICE' | 'AUCTION' | 'BEST_OFFER' | 'unknown';

export interface Listing {
  id: string;
  marketplace: Marketplace;
  externalId: string;
  title: string;
  url: string;
  imageUrl: string;
  price: number;
  shipping: number;
  totalPrice: number;
  currency: string;
  condition: ListingCondition;
  sellerName: string;
  sellerRating: number | null;
  location: string;
  buyingOption: BuyingOption;
  firstSeenAt: string;
  lastSeenAt: string;
  rawDataHash: string;
  status: ListingStatus;
}

// ─── Catalog ───
export type ItemType = 'SET' | 'MINIFIG' | 'PART' | 'LOT' | 'UNKNOWN';

export interface CatalogMatch {
  id: string;
  listingId: string;
  itemType: ItemType;
  bricklinkNo: string;
  rebrickableNo: string;
  confidence: number;
  matchReason: string;
  createdAt: string;
}

// ─── Valuation ───
export interface Valuation {
  id: string;
  listingId: string;
  bricklinkSoldAvg: number | null;
  bricklinkStockAvg: number | null;
  bricklinkMinPrice: number | null;
  estimatedResaleValue: number;
  totalCost: number;
  marginAbs: number;
  marginPct: number;
  valuationConfidence: number;
  createdAt: string;
}

// ─── Deal Review ───
export type SuggestedAction = 'buy_review' | 'ask_review' | 'watch' | 'ignore';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'watched' | 'ignored';

export interface DealReview {
  id: string;
  listingId: string;
  dealScore: number;
  riskScore: number;
  suggestedAction: SuggestedAction;
  aiSummary: string;
  riskSummary: string;
  draftedMessage: string;
  approvedByUser: boolean;
  approvedAt: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Search Job ───
export interface SearchFilters {
  maxPrice?: number;
  minPrice?: number;
  buyingOptions?: string[];
  condition?: string[];
  categoryIds?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchJob {
  id: string;
  marketplace: Marketplace;
  query: string;
  filters: SearchFilters;
  intervalMinutes: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
}

// ─── Pipeline Result ───
export interface PipelineResult {
  listing: Listing;
  catalogMatch: CatalogMatch | null;
  valuation: Valuation | null;
  dealReview: DealReview;
}

// ─── BrickLink API Types ───
export interface BricklinkPriceGuide {
  item: { no: string; type: string };
  new_or_used: string;
  currency_code: string;
  min_price: string;
  max_price: string;
  avg_price: string;
  qty_avg_price: string;
  unit_quantity: number;
  total_quantity: number;
  price_detail: Array<{ quantity: number; unit_price: string }>;
}

export interface BricklinkCatalogItem {
  no: string;
  name: string;
  type: string;
  category_id: number;
  image_url: string;
  thumbnail_url: string;
  weight: string;
  dim_x: string;
  dim_y: string;
  dim_z: string;
  year_released: number;
  is_obsolete: boolean;
}

// ─── eBay API Types ───
export interface EbaySearchResult {
  itemId: string;
  title: string;
  itemWebUrl: string;
  image?: { imageUrl: string };
  price: { value: string; currency: string };
  shippingOptions?: Array<{
    shippingCostType: string;
    shippingCost?: { value: string; currency: string };
  }>;
  seller?: { username: string; feedbackPercentage: string; feedbackScore: number };
  condition: string;
  conditionId: string;
  itemLocation?: { country: string; postalCode?: string };
  buyingOptions?: string[];
  itemEndDate?: string;
}

// ─── AI Review Types ───
export interface AiReviewResult {
  aiSummary: string;
  whatItProbablyIs: string;
  reasonForOpportunity: string;
  riskSummary: string;
  suggestedAction: SuggestedAction;
  draftedMessage: string;
  confidence: number;
  complianceFlags: string[];
}
