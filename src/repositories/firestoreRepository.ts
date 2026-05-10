import { Firestore } from '@google-cloud/firestore';
import type { Listing, CatalogMatch, Valuation, DealReview, SearchJob, PipelineResult } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Firestore-backed repository for production persistence.
 * Mirrors the InMemoryStore interface so the two are interchangeable.
 * 
 * Collections:
 * - listings        → discovered marketplace listings
 * - catalogMatches   → BrickLink catalog match results
 * - valuations       → price guide valuations
 * - dealReviews      → scored & reviewed deals
 * - searchJobs       → configured search job definitions
 */
export class FirestoreRepository {
  private static instance: FirestoreRepository;
  private db: Firestore;

  private constructor() {
    this.db = new Firestore({
      projectId: env.googleCloudProject,
      databaseId: env.firestoreDatabase || '(default)',
    });
    logger.info('Firestore repository initialized');
  }

  static getInstance(): FirestoreRepository {
    if (!FirestoreRepository.instance) {
      FirestoreRepository.instance = new FirestoreRepository();
    }
    return FirestoreRepository.instance;
  }

  // ─── Search Jobs ───
  async addSearchJob(job: SearchJob): Promise<void> {
    await this.db.collection('searchJobs').doc(job.id).set(job);
  }

  async getSearchJobs(): Promise<SearchJob[]> {
    const snapshot = await this.db.collection('searchJobs').get();
    return snapshot.docs.map((doc) => doc.data() as SearchJob);
  }

  async getSearchJob(id: string): Promise<SearchJob | undefined> {
    const doc = await this.db.collection('searchJobs').doc(id).get();
    return doc.exists ? (doc.data() as SearchJob) : undefined;
  }

  async updateSearchJob(id: string, updates: Partial<SearchJob>): Promise<void> {
    await this.db.collection('searchJobs').doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  // ─── Listings ───
  async addListing(listing: Listing): Promise<void> {
    await this.db.collection('listings').doc(listing.id).set(listing);
  }

  async getListings(limit = 200): Promise<Listing[]> {
    const snapshot = await this.db.collection('listings')
      .orderBy('firstSeenAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => doc.data() as Listing);
  }

  async getListing(id: string): Promise<Listing | undefined> {
    const doc = await this.db.collection('listings').doc(id).get();
    return doc.exists ? (doc.data() as Listing) : undefined;
  }

  async getListingHashes(): Promise<Set<string>> {
    const snapshot = await this.db.collection('listings')
      .select('rawDataHash')
      .get();
    return new Set(snapshot.docs.map((doc) => doc.data().rawDataHash as string));
  }

  // ─── Catalog Matches ───
  async addCatalogMatch(match: CatalogMatch): Promise<void> {
    await this.db.collection('catalogMatches').doc(match.id).set(match);
  }

  async getCatalogMatchByListingId(listingId: string): Promise<CatalogMatch | undefined> {
    const snapshot = await this.db.collection('catalogMatches')
      .where('listingId', '==', listingId)
      .limit(1)
      .get();
    return snapshot.empty ? undefined : (snapshot.docs[0].data() as CatalogMatch);
  }

  // ─── Valuations ───
  async addValuation(valuation: Valuation): Promise<void> {
    await this.db.collection('valuations').doc(valuation.id).set(valuation);
  }

  async getValuationByListingId(listingId: string): Promise<Valuation | undefined> {
    const snapshot = await this.db.collection('valuations')
      .where('listingId', '==', listingId)
      .limit(1)
      .get();
    return snapshot.empty ? undefined : (snapshot.docs[0].data() as Valuation);
  }

  // ─── Deal Reviews ───
  async addDealReview(review: DealReview): Promise<void> {
    await this.db.collection('dealReviews').doc(review.id).set(review);
  }

  async getDealReviews(options: { minScore?: number; limit?: number } = {}): Promise<DealReview[]> {
    let query = this.db.collection('dealReviews')
      .orderBy('dealScore', 'desc')
      .limit(options.limit || 100) as FirebaseFirestore.Query;

    if (options.minScore) {
      query = query.where('dealScore', '>=', options.minScore);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as DealReview);
  }

  async getDealReview(id: string): Promise<DealReview | undefined> {
    const doc = await this.db.collection('dealReviews').doc(id).get();
    return doc.exists ? (doc.data() as DealReview) : undefined;
  }

  async updateDealReview(id: string, updates: Partial<DealReview>): Promise<void> {
    await this.db.collection('dealReviews').doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  // ─── Pipeline Results (aggregated) ───
  async getPipelineResults(options: { minScore?: number; limit?: number } = {}): Promise<PipelineResult[]> {
    const reviews = await this.getDealReviews(options);
    const results: PipelineResult[] = [];

    for (const review of reviews) {
      const listing = await this.getListing(review.listingId);
      if (!listing) continue;

      const [catalogMatch, valuation] = await Promise.all([
        this.getCatalogMatchByListingId(listing.id),
        this.getValuationByListingId(listing.id),
      ]);

      results.push({
        listing,
        catalogMatch: catalogMatch || null,
        valuation: valuation || null,
        dealReview: review,
      });
    }

    return results;
  }

  // ─── Statistics ───
  async getStats(): Promise<{
    totalListings: number;
    totalReviews: number;
    totalJobs: number;
    highScoreDeals: number;
  }> {
    const [listings, reviews, jobs] = await Promise.all([
      this.db.collection('listings').count().get(),
      this.db.collection('dealReviews').count().get(),
      this.db.collection('searchJobs').count().get(),
    ]);

    const highScore = await this.db.collection('dealReviews')
      .where('dealScore', '>=', 60)
      .count()
      .get();

    return {
      totalListings: listings.data().count,
      totalReviews: reviews.data().count,
      totalJobs: jobs.data().count,
      highScoreDeals: highScore.data().count,
    };
  }
}
