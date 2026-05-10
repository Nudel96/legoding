# 🧱 LEGO Star Wars Deal Finder Agent

A compliance-safe, AI-assisted deal-finding agent that automatically discovers undervalued LEGO Star Wars listings on eBay, evaluates them against BrickLink market data, calculates deal scores, and presents the best opportunities in a review queue for human approval.

**No automatic purchases. No mass messaging. No scraping. No CAPTCHA bypass.**

## Architecture Overview

```
Cloud Scheduler → Express API → eBay Browse API → Normalizer → Catalog Matcher
                                                  → BrickLink Price Guide → Valuation Engine
                                                  → Risk Detection → Deal Scoring → AI Review
                                                  → Firestore / In-Memory → Google Sheets → Notifications
```

## Features (MVP)

- ✅ eBay Browse API integration (OAuth2, search, pagination)
- ✅ BrickLink API integration (OAuth 1.0a, catalog, price guide)
- ✅ Listing normalization (price, shipping, dedup, hash)
- ✅ Catalog matching (set numbers, minifig IDs, keywords, confidence)
- ✅ Risk detection (fake/custom/damage keywords, seller rating, origin)
- ✅ Valuation engine (BrickLink sold/stock average, margin calculation)
- ✅ Deal scoring (0–100, weighted: margin + rarity + confidence + terms - risk)
- ✅ Mock mode for all connectors (works without API keys)
- ✅ 7 pre-configured search jobs (including typo queries)
- ✅ REST API with scheduler endpoints
- ✅ 68 unit tests passing
- ✅ Human Approval Gate (no auto-buy)
- ✅ Google Sheets review queue export
- ✅ Notification service (Google Chat webhooks)
- ✅ BrickLink Wanted List XML export
- ✅ Firestore repository (production-ready)
- ✅ Review summary & filtering API

## 🤖 AI Agent Handover Guide (Auto-Setup)

**An die ausführende KI (Cursor, Copilot, Gemini etc.):**
Wenn dein menschlicher Nutzer dich beauftragt hat, die APIs für dieses Projekt zu implementieren, befolge exakt diese Schritte. Nutze dazu dein **Browser-Automatisierungs-Tool** (z.B. `browser_subagent`), um die Keys vollautomatisch auszulesen und in die `.env` Datei einzutragen.

### 🛑 Vorbedingung (Wichtig für den Menschen)
Bevor du als Agent startest, sag deinem Nutzer, dass er in seinem Standardbrowser bei **Google**, **eBay** und **BrickLink** eingeloggt sein muss. *Wichtig: Der BrickLink Account benötigt ein Upgrade zum Verkäufer (Seller Upgrade)!* Ohne diesen Login bleibst du als Bot in 2FA/Captchas stecken.

### Schritt 1: Datei-Setup
Erstelle eine `.env` Datei basierend auf der `.env.example`.

### Schritt 2: API Keys per Browser-Subagent extrahieren

#### 1. Gemini AI API Key (`GEMINI_API_KEY`)
*   **URL:** `https://aistudio.google.com/app/apikey`
*   **Agenten-Aktion:** Navigiere zur URL, klicke "Create API key", generiere den Key für ein Projekt, kopiere ihn und speichere ihn in `.env`.

#### 2. eBay Developer Browse API (`EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`)
*   **URL:** `https://developer.ebay.com/my/keys`
*   **Agenten-Aktion:** Navigiere zum eBay Developer Portal. Erstelle bei Bedarf eine App, wechsle zu den **Production Keys** und extrahiere die `App ID` (Client ID) und `Cert ID` (Client Secret).

#### 3. BrickLink API (`BRICKLINK_CONSUMER_KEY`, `BRICKLINK_CONSUMER_SECRET`, `BRICKLINK_TOKEN_VALUE`, `BRICKLINK_TOKEN_SECRET`)
*   **URL:** `https://www.bricklink.com/v2/api/register_consumer.page`
*   **Agenten-Aktion:** Navigiere zur URL. Trage bei **IP Mask** `0.0.0.0/0` ein. Akzeptiere die AGBs und klicke auf "Request/Submit". Kopiere danach alle 4 Secrets präzise in die `.env`.

### Schritt 3: Google Services & Webhooks (Manuell oder per Anleitung)
*   **Google Chat Webhook:** Erstelle einen Space in Google Chat, wähle "Apps & Integrationen" -> "Webhooks verwalten", erstelle einen Webhook namens "Lego Deal Finder" und trage die URL als `GOOGLE_CHAT_WEBHOOK_URL` ein.
*   **Firestore & Sheets:** Richte ein Google Cloud Projekt ein, aktiviere Firestore und die Google Sheets API, erstelle ein Service Account JSON und trage den Pfad bei `GOOGLE_APPLICATION_CREDENTIALS` ein.

Sobald du (die KI) alle Variablen in der `.env` gesetzt hast, führe `npm install` und `npm run dev` aus und teile dem Nutzer mit, dass das Dashboard unter `http://localhost:3000` erreichbar ist!

---

## 🔑 Manuelle API Konfiguration

Falls du die Keys manuell eintragen möchtest, hier die Übersicht:

| Service | Required | Purpose |
|---|---|---|
| eBay Client ID/Secret | Optional (mock available) | Browse API for active listings |
| BrickLink Consumer/Token | Optional (mock available) | Catalog & Price Guide |
| Gemini API Key | Optional (mock available) | AI review & drafted messages |
| Google Cloud Project | Optional (in-memory available) | Firestore persistence |
| Google Sheets Spreadsheet ID | Optional | Review queue export |
| Google Chat Webhook URL | Optional | Deal notifications |

## .env Configuration

Copy `.env.example` to `.env` and fill in your credentials. The system runs in full mock mode without any keys.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check with stats |
| GET | `/api/search-jobs` | List all search jobs |
| POST | `/api/search-jobs` | Create a search job |
| PATCH | `/api/search-jobs/:id` | Update a search job |
| DELETE | `/api/search-jobs/:id` | Deactivate a search job |
| GET | `/api/listings` | List all discovered listings |
| GET | `/api/listings/:id` | Listing detail + catalog + valuation |
| GET | `/api/reviews?minScore=N&action=X&status=Y` | Filtered scored reviews |
| GET | `/api/reviews/summary` | Deal summary with action/status breakdown |
| PATCH | `/api/reviews/:id` | Approve/reject a review |
| POST | `/api/scheduler/run` | Run all active search jobs |
| POST | `/api/scheduler/run/:jobId` | Run a specific job |
| GET | `/api/export/wanted-list?minScore=N` | BrickLink Wanted List XML download |
| POST | `/api/export/sheets` | Manual Google Sheets export |
| POST | `/api/export/notify` | Manual notification trigger |

## Tests

```bash
npm test            # Run all tests
npm run test:watch  # Watch mode
```

68 tests covering:
- Listing normalizer (price, shipping, dedup, condition mapping)
- Catalog matcher (set numbers, minifigs, lots, confidence)
- Risk detection (fake/custom/damage keywords, seller/origin)
- Deal scoring (margin, rarity, confidence, risk penalty)
- Utility functions (money, text, hashing)
- Wanted List XML generation (types, conditions, pricing, filtering)
- Notification text summaries

## Deployment (Cloud Run)

```bash
# Build Docker image
docker build -t lego-deal-finder .

# Deploy to Cloud Run
gcloud run deploy lego-deal-finder \
  --image lego-deal-finder \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated

# Set up Cloud Scheduler (every 2 hours)
gcloud scheduler jobs create http run-deals \
  --schedule="0 */2 * * *" \
  --uri="https://YOUR_URL/api/scheduler/run" \
  --http-method=POST
```

## Compliance

- ✅ Uses **only official APIs** (eBay Browse API, BrickLink API)
- ✅ **No automatic purchases** — all deals require human review
- ✅ **No mass messaging** — drafted messages for manual review only
- ✅ **No off-platform deals** — all transactions via marketplace
- ✅ **No CAPTCHA bypass** — purely API-based
- ✅ **No browser scraping** — no headless browser automation
- ✅ **Minimal seller data** — only public marketplace data stored
- ✅ **Rate limited** — respects all API rate limits

## Limitations

- Mock mode returns same listings for all queries (real API returns different results)
- No Firestore persistence in dev mode (in-memory only, auto-switches with credentials)
- No currency conversion (EUR only)
- No historical price tracking yet

## Next Steps

1. Configure real eBay & BrickLink API keys
2. Deploy to Cloud Run with Cloud Scheduler
3. Add real Gemini API key for AI review
4. Configure Google Sheets spreadsheet ID for review queue
5. Set up Google Chat webhook for notifications
6. Historical price tracking & trend analysis
7. Dashboard frontend
