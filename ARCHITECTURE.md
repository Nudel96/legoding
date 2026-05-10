# ARCHITECTURE — LEGO Star Wars Deal Finder Agent

## Systemübersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cloud Scheduler (Cron)                      │
│                    POST /api/scheduler/run                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express/Fastify Server                        │
│                     (Cloud Run / Local)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  eBay Browse  │  │  BrickLink   │  │  Rebrickable         │  │
│  │  API Connector│  │  API Connect │  │  API Connector (opt) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         ▼                 ▼                      ▼              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Listing Normalizer                          │    │
│  │   (Preis-Normalisierung, Duplikate, rawDataHash)        │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                     │
│  ┌────────────────────────▼────────────────────────────────┐    │
│  │              Catalog Matcher                             │    │
│  │   (Set-Nr Regex, Keywords, Fuzzy, Confidence)           │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                     │
│  ┌────────────────────────▼────────────────────────────────┐    │
│  │          Valuation Engine (BrickLink Preise)             │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                     │
│  ┌────────────────────────▼────────────────────────────────┐    │
│  │              Risk Detection                              │    │
│  │   (Warnwörter, Risikolevel 0–100)                       │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                     │
│  ┌────────────────────────▼────────────────────────────────┐    │
│  │              Deal Scoring (0–100)                        │    │
│  │   (Margin + Rarity + Confidence + Terms + Urgency       │    │
│  │    - Risk Penalty)                                      │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                     │
│  ┌────────────────────────▼────────────────────────────────┐    │
│  │         AI Review Service (Gemini, optional)             │    │
│  │   (Summary, Risk, Drafted Message, Compliance)          │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                  │
│         ▼                 ▼                 ▼                  │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐        │
│  │  Firestore  │  │ Google Sheets│  │  Notifications  │        │
│  │  Repository │  │ Review Queue │  │  (Chat/Gmail)   │        │
│  └────────────┘  └──────────────┘  └─────────────────┘        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           Human Approval Gate (Manual)                   │    │
│  │   Review → Approve/Reject → Marketplace Action          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Datenfluss

1. **Scheduler** triggert `searchJobService.runAll()`
2. Für jeden aktiven SearchJob:
   - Connector führt API-Suche aus → Raw Listings
   - **Normalizer** → Einheitliches Listing-Format
   - **Duplikatprüfung** via rawDataHash
   - **Catalog Matcher** → Set/Minifig-Identifikation
   - **Valuation** via BrickLink Price Guide → Margin-Berechnung
   - **Risk Detection** → Risiko-Score
   - **Deal Scoring** → Gesamt-Score 0–100
   - Optional: **AI Review** via Gemini
3. **Speichern** in Firestore
4. **Export** in Google Sheets Review Queue
5. **Benachrichtigung** falls Score ≥ Schwellwert
6. **Mensch** reviewt und entscheidet

## Module

| Modul | Verantwortung |
|---|---|
| `ebayConnector` | eBay Browse API, OAuth2, Suche, Pagination |
| `bricklinkConnector` | BrickLink API, OAuth 1.0a, Catalog, Price Guide |
| `rebrickableConnector` | Rebrickable API (optional), Set-Validierung |
| `listingNormalizer` | Preis-Normalisierung, Hash, Duplikate |
| `catalogMatcher` | Set-Erkennung, Keyword-Matching, Confidence |
| `valuationService` | Marktwert-Berechnung, Margin |
| `riskDetectionService` | Warnwort-Analyse, Risiko-Score |
| `dealScoringService` | Gesamt-Score, Action-Empfehlung |
| `aiReviewService` | Gemini AI Zusammenfassung, Nachrichtenentwurf |
| `searchJobService` | Scheduler-Orchestrierung |
| `googleSheetsService` | Google Sheets Export/Update |
| `notificationService` | Google Chat / Gmail Benachrichtigungen |
| `wantedListXmlService` | BrickLink Wanted List XML-Erzeugung |

## Datenbankmodell (Firestore)

### Collection: `search_jobs`
- `id`, `marketplace`, `query`, `filters`, `intervalMinutes`, `active`, `createdAt`, `updatedAt`, `lastRunAt`

### Collection: `listings`
- `id`, `marketplace`, `externalId`, `title`, `url`, `imageUrl`, `price`, `shipping`, `totalPrice`, `currency`, `condition`, `sellerName`, `sellerRating`, `location`, `buyingOption`, `firstSeenAt`, `lastSeenAt`, `rawDataHash`, `status`

### Collection: `catalog_matches`
- `id`, `listingId`, `itemType`, `bricklinkNo`, `rebrickableNo`, `confidence`, `matchReason`, `createdAt`

### Collection: `valuations`
- `id`, `listingId`, `bricklinkSoldAvg`, `bricklinkStockAvg`, `bricklinkMinPrice`, `estimatedResaleValue`, `totalCost`, `marginAbs`, `marginPct`, `valuationConfidence`, `createdAt`

### Collection: `deal_reviews`
- `id`, `listingId`, `dealScore`, `riskScore`, `suggestedAction`, `aiSummary`, `riskSummary`, `draftedMessage`, `approvedByUser`, `approvedAt`, `status`, `createdAt`, `updatedAt`

## Security-Konzept

- API Keys nur über Environment Variables / Secret Manager
- Keine Secrets im Code oder Git
- `.env` in `.gitignore`
- Firestore Security Rules für Production
- Rate Limiting auf API Endpoints
- Input Validation auf allen Routen

## Compliance-Konzept

1. **Offizielle APIs**: Nur eBay Browse API und BrickLink API — kein Scraping
2. **Kein automatischer Kauf**: Jede Kaufentscheidung erfordert menschliche Freigabe
3. **Keine Massennachrichten**: Nachrichtenentwürfe nur zur manuellen Prüfung
4. **Keine Off-Plattform-Deals**: Keine privaten Zahlungsaufforderungen
5. **Keine CAPTCHA-Umgehung**: Ausschließlich API-basiert
6. **Datenschutz**: Keine unnötige Speicherung personenbezogener Verkäuferdaten
7. **Plattformregeln**: Alle Aktionen plattformkonform
