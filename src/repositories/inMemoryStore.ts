import type { Listing, CatalogMatch, Valuation, DealReview, SearchJob, PipelineResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory store for MVP development.
 * Replaces Firestore when GOOGLE_CLOUD_PROJECT is not set.
 * Data persists only during the server's lifetime.
 */
export class InMemoryStore {
  private static instance: InMemoryStore;

  private listings: Map<string, Listing> = new Map();
  private catalogMatches: Map<string, CatalogMatch> = new Map();
  private valuations: Map<string, Valuation> = new Map();
  private dealReviews: Map<string, DealReview> = new Map();
  private searchJobs: Map<string, SearchJob> = new Map();

  private constructor() {}

  static getInstance(): InMemoryStore {
    if (!InMemoryStore.instance) {
      InMemoryStore.instance = new InMemoryStore();
    }
    return InMemoryStore.instance;
  }

  // ─── Search Jobs ───
  addSearchJob(job: SearchJob): void {
    this.searchJobs.set(job.id, job);
  }

  getSearchJobs(): SearchJob[] {
    return Array.from(this.searchJobs.values());
  }

  getSearchJob(id: string): SearchJob | undefined {
    return this.searchJobs.get(id);
  }

  updateSearchJob(id: string, updates: Partial<SearchJob>): void {
    const job = this.searchJobs.get(id);
    if (job) {
      this.searchJobs.set(id, { ...job, ...updates, updatedAt: new Date().toISOString() });
    }
  }

  // ─── Listings ───
  addListing(listing: Listing): void {
    this.listings.set(listing.id, listing);
  }

  getListings(): Listing[] {
    return Array.from(this.listings.values());
  }

  getListing(id: string): Listing | undefined {
    return this.listings.get(id);
  }

  // ─── Catalog Matches ───
  addCatalogMatch(match: CatalogMatch): void {
    this.catalogMatches.set(match.id, match);
  }

  getCatalogMatchByListingId(listingId: string): CatalogMatch | undefined {
    return Array.from(this.catalogMatches.values()).find((m) => m.listingId === listingId);
  }

  // ─── Valuations ───
  addValuation(valuation: Valuation): void {
    this.valuations.set(valuation.id, valuation);
  }

  getValuationByListingId(listingId: string): Valuation | undefined {
    return Array.from(this.valuations.values()).find((v) => v.listingId === listingId);
  }

  // ─── Deal Reviews ───
  addDealReview(review: DealReview): void {
    this.dealReviews.set(review.id, review);
  }

  getDealReviews(): DealReview[] {
    return Array.from(this.dealReviews.values());
  }

  getDealReview(id: string): DealReview | undefined {
    return this.dealReviews.get(id);
  }

  updateDealReview(id: string, updates: Partial<DealReview>): void {
    const review = this.dealReviews.get(id);
    if (review) {
      this.dealReviews.set(id, { ...review, ...updates, updatedAt: new Date().toISOString() });
    }
  }

  // ─── Aggregated Pipeline Results ───
  getPipelineResults(): PipelineResult[] {
    return this.getDealReviews()
      .map((review) => {
        const listing = this.listings.get(review.listingId);
        if (!listing) return null;
        return {
          listing,
          catalogMatch: this.getCatalogMatchByListingId(listing.id) || null,
          valuation: this.getValuationByListingId(listing.id) || null,
          dealReview: review,
        };
      })
      .filter((r): r is PipelineResult => r !== null)
      .sort((a, b) => b.dealReview.dealScore - a.dealReview.dealScore);
  }

  // ─── Clear ───
  clear(): void {
    this.listings.clear();
    this.catalogMatches.clear();
    this.valuations.clear();
    this.dealReviews.clear();
    this.searchJobs.clear();
  }
}
