# SELF REVIEW — LEGO Star Wars Deal Finder Agent

**Date:** 2026-05-10
**Phase:** MVP Complete

---

## Was wurde gebaut?

### Core Pipeline (vollständig)
- **eBay Connector** — OAuth2 Client Credentials, Browse API Search, Pagination, Rate Limiting, Mock Mode
- **BrickLink Connector** — OAuth 1.0a Signierung, Catalog Item, Price Guide, Mock Mode
- **Listing Normalizer** — Preis-Normalisierung (EUR), Shipping, Condition Mapping, Duplikat-Erkennung via SHA-256 Hash
- **Catalog Matcher** — Set-Nr. Regex, BrickLink Minifig-Nr. (sw0450), Star Wars Keywords, Lot/Konvolut Erkennung, Confidence Score 0–1
- **Risk Detection** — 30+ Negative Keywords (3 Stufen: kritisch/moderat/minor), Seller Rating, Origin, Preis-Anomalie, Positive Keywords als Risk-Reduktion
- **Valuation Engine** — BrickLink Sold Avg (70% Gewicht) + Stock Avg (30%), Margin-Berechnung, Confidence-Kaskade
- **Deal Scoring** — 0–100 Score (Margin 40pt + Rarity 20pt + Confidence 20pt + Positive 10pt + Urgency 10pt - Risk bis -50pt)
- **AI Review Service** — Gemini API Integration + Mock Fallback, Compliance-sichere Nachrichtenentwürfe

### Infrastruktur
- **Express REST API** — Health, SearchJobs, Listings, Reviews, Scheduler
- **In-Memory Store** — MVP-Persistenz, Firestore-ready Interface
- **Seed Search Jobs** — 7 vorkonfigurierte Suchjobs inkl. Tippfehler-Varianten
- **Winston Logger** — Dev/Prod-Modi, JSON/Simple Format
- **Retry + Rate Limiter** — Exponential Backoff, Token Bucket

### Tests
- **57 Unit Tests** — alle grün
- **5 Test-Suites**: Normalizer, Catalog Matcher, Risk Detection, Deal Scoring, Utilities

### Dokumentation
- PROJECT_PLAN.md, ARCHITECTURE.md, TASKS.md, ASSUMPTIONS.md, RISK_REGISTER.md, QA_CHECKLIST.md
- README.md mit Setup, API, Deployment, Compliance
- .env.example mit allen Variablen

---

## Was funktioniert?

1. ✅ Server startet korrekt (Port 8080)
2. ✅ Health Endpoint gibt Status zurück
3. ✅ 7 Seed Search Jobs werden automatisch geladen
4. ✅ `POST /api/scheduler/run` führt alle Jobs aus
5. ✅ Mock-Modus funktioniert ohne API Keys
6. ✅ Duplikat-Erkennung über rawDataHash
7. ✅ Captain Rex Minifig wird als profitabler Deal erkannt (Score 68, 209% Margin)
8. ✅ Fake/Custom LEGO wird korrekt abgestraft (Score 0, Risk 85)
9. ✅ UCS Sets bekommen Rarity-Bonus
10. ✅ Lots/Konvolute werden mit reduzierter Confidence behandelt
11. ✅ Alle 57 Tests grün

---

## Was wurde NICHT gebaut?

| Feature | Grund | Priorität |
|---|---|---|
| Google Sheets Export | Phase 2 — Service-Interface bereit | Hoch |
| Notification Service | Phase 2 — Google Chat/Gmail | Mittel |
| Firestore Persistence | In-Memory Store als Interface-kompatible Brücke | Hoch |
| Rebrickable Connector | Optional, graceful fallback | Niedrig |
| Wanted List XML | Phase 2 | Niedrig |
| Cloud Run Deployment | Dockerfile erstellt, nicht deployed | Mittel |
| Währungskonvertierung | EUR-only für MVP | Niedrig |
| Historische Preisverfolgung | Phase 2 | Mittel |

---

## Welche Risiken bleiben?

1. **Mock-Preisdaten decken nicht alle Sets ab** — Real API Keys werden andere Ergebnisse liefern
2. **eBay Browse API Sandbox ≠ Production** — Sandbox-Verhalten kann abweichen
3. **BrickLink Rate Limits unbekannt** — Müssen im Livebetrieb getestet werden
4. **Lot-Bewertung ungenau** — Ohne Einzelteil-Aufschlüsselung schwer zu bewerten
5. **Keine persistente Speicherung** — Daten gehen bei Neustart verloren (bis Firestore aktiv)

---

## Welche nächsten Schritte sind sinnvoll?

1. **Echte API Keys konfigurieren** — eBay + BrickLink
2. **Google Sheets Export** — `googleSheetsService.ts` implementieren
3. **Firestore aktivieren** — `firestoreRepository.ts` implementieren
4. **Cloud Run Deployment** — Docker Image + Cloud Scheduler
5. **Gemini AI Key eintragen** — Live AI Reviews testen
6. **Mock-Preisdaten erweitern** — Mehr Sets/Minifigs für realistische Tests

---

## Welche Annahmen wurden getroffen?

→ Siehe ASSUMPTIONS.md (vollständig dokumentiert)

Wichtigste:
- Express.js statt Fastify (breitere Ökosystem-Unterstützung)
- In-Memory Store als Firestore-Bridge für MVP
- EUR als einzige Währung
- EBAY_DE als primärer Marktplatz
- BrickLink 6M Sold Average als primäre Bewertungsquelle
- Deal Score 80+ = buy_review (nur Empfehlung, kein Auto-Kauf)
