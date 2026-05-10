# TASKS — LEGO Star Wars Deal Finder Agent

## Phase A: Planung & Architektur ✅
| # | Aufgabe | Status |
|---|---|---|
| A1 | PROJECT_PLAN.md | ✅ |
| A2 | ARCHITECTURE.md | ✅ |
| A3 | TASKS.md | ✅ |
| A4 | ASSUMPTIONS.md | ✅ |
| A5 | RISK_REGISTER.md | ✅ |
| A6 | QA_CHECKLIST.md | ✅ |

## Phase B: Projektstruktur ✅
| # | Aufgabe | Status |
|---|---|---|
| B1 | package.json + TypeScript Setup | ✅ |
| B2 | tsconfig.json | ✅ |
| B3 | Ordnerstruktur | ✅ |
| B4 | .env.example | ✅ |
| B5 | .gitignore | ✅ |
| B6 | Type-Definitionen | ✅ |
| B7 | Config/Env Loader | ✅ |
| B8 | Logger Utility | ✅ |
| B9 | Retry/RateLimit | ✅ |
| B10 | Build verifiziert | ✅ |

## Phase C: Connectoren ✅
| # | Aufgabe | Status |
|---|---|---|
| C1 | eBay OAuth2 | ✅ |
| C2 | eBay Browse API Search | ✅ |
| C3 | eBay Mock Mode | ✅ |
| C4 | BrickLink OAuth 1.0a | ✅ |
| C5 | BrickLink Catalog + Price Guide | ✅ |
| C6 | BrickLink Mock Mode | ✅ |
| C7 | Rebrickable Connector | 🔲 P3 |

## Phase D: Core Pipeline ✅
| # | Aufgabe | Status |
|---|---|---|
| D1 | Listing Normalizer | ✅ |
| D2 | Catalog Matcher | ✅ |
| D3 | Valuation Engine | ✅ |
| D4 | Risk Detection | ✅ |
| D5 | Deal Scoring | ✅ |
| D6 | Unit Tests (68/68 green) | ✅ |

## Phase E: Persistence & API ✅
| # | Aufgabe | Status |
|---|---|---|
| E1 | In-Memory Store (Firestore-ready) | ✅ |
| E2 | REST API Routes | ✅ |
| E3 | Search Job Service | ✅ |
| E4 | Scheduler Endpoint | ✅ |
| E5 | Google Sheets Service | ✅ |
| E6 | Seed Search Jobs | ✅ |
| E7 | Firestore Repository | ✅ |

## Phase F: Erweiterungen ✅
| # | Aufgabe | Status |
|---|---|---|
| F1 | AI Review Service (Mock) | ✅ |
| F2 | AI Review Service (Gemini live) | ✅ (code ready, needs key) |
| F3 | Notification Service (Google Chat + Log) | ✅ |
| F4 | Wanted List XML Export | ✅ |
| F5 | Dockerfile | ✅ |
| F6 | README.md | ✅ |
| F7 | SELF_REVIEW.md | ✅ |
| F8 | Review Summary API | ✅ |
| F9 | Review Filtering (action, status) | ✅ |
| F10 | Listing Detail API | ✅ |
| F11 | Manual Export Triggers (Sheets, Notify) | ✅ |

## Phase G: Deployment (offen)
| # | Aufgabe | Status |
|---|---|---|
| G1 | Cloud Run Deploy | 🔲 |
| G2 | Cloud Scheduler | 🔲 |
| G3 | Secret Manager für API Keys | 🔲 |
| G4 | Dashboard Frontend | 🔲 |
