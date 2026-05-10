# PROJECT PLAN — LEGO Star Wars Deal Finder Agent

## Zielbild

Ein compliance-sicherer, KI-gestützter Agent, der automatisch eBay- und BrickLink-Angebote überwacht, lukrative LEGO-Star-Wars-Deals erkennt, bewertet, priorisiert und in einer Review-Queue bereitstellt. Alle echten Marktplatzaktionen erfordern menschliche Freigabe (Human-Approval-Gate).

---

## MVP Scope (Phase 1)

| Feature | Status |
|---|---|
| eBay Browse API Connector (OAuth2, Search, Pagination) | 🔲 |
| BrickLink API Connector (OAuth 1.0a, Catalog, Price Guide) | 🔲 |
| Listing Normalizer | 🔲 |
| Catalog Matcher (Set-Nr. Regex, Keyword Matching) | 🔲 |
| Valuation Engine (BrickLink Price Guide basiert) | 🔲 |
| Risk Detection (Warnwörter, Score) | 🔲 |
| Deal Scoring Engine (0–100) | 🔲 |
| Firestore Repository Layer | 🔲 |
| REST API (Health, SearchJobs, Listings, Reviews, Scheduler) | 🔲 |
| Google Sheets Review Queue Export | 🔲 |
| Unit Tests (Valuation, Scoring, Risk, Matcher, Normalizer) | 🔲 |
| Seed Search Jobs | 🔲 |
| Mock Mode (alle Connectoren) | 🔲 |

## Spätere Erweiterungen (Phase 2+)

| Feature | Priorität |
|---|---|
| Gemini AI Review Service | Hoch |
| Google Chat / Gmail Notifications | Mittel |
| Rebrickable API Integration | Mittel |
| BrickLink Wanted List XML Export | Niedrig |
| AppSheet-kompatible Sheets-Struktur | Niedrig |
| Cloud Run Deployment + Cloud Scheduler | Hoch |
| Historische Preisverfolgung | Mittel |
| Dashboard / Web UI | Niedrig |

---

## Technische Meilensteine

### M1: Projektstruktur & Planung
- Alle Planungsdateien erstellt
- TypeScript-Projekt initialisiert
- Build funktioniert

### M2: Connectoren
- eBay Browse API Connector mit OAuth2
- BrickLink API Connector mit OAuth 1.0a
- Mock-Modus für beide

### M3: Core Pipeline
- Listing Normalizer
- Catalog Matcher
- Valuation Engine
- Risk Detection
- Deal Scoring

### M4: Persistence & API
- Firestore Repository
- REST API Endpoints
- Scheduler Flow

### M5: Review Queue
- Google Sheets Export
- Duplikaterkennung

### M6: Tests & QA
- Unit Tests für alle Core Services
- Integration Test mit Mock-Daten
- Self-Review

---

## Setup-Schritte

1. `npm install`
2. `.env` aus `.env.example` erstellen
3. API Keys eintragen (eBay, BrickLink, optional Gemini)
4. Firestore-Projekt konfigurieren oder Mock-Modus nutzen
5. `npm run dev` für lokale Entwicklung
6. `npm test` für Tests

## Deployment-Schritte

1. Docker Image bauen: `docker build -t lego-deal-finder .`
2. Google Cloud Run deployen
3. Cloud Scheduler für `/api/scheduler/run` einrichten
4. Secret Manager für API Keys konfigurieren
5. Google Sheets Spreadsheet ID eintragen
