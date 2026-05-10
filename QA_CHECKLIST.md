# QA CHECKLIST — LEGO Star Wars Deal Finder Agent

## Build & Compile
- [ ] `npm install` erfolgreich
- [ ] `npm run build` ohne TypeScript-Fehler
- [ ] `npm run dev` startet Server auf Port 8080
- [ ] `GET /health` gibt 200 zurück

## Unit Tests
- [ ] `valuationService.test.ts` — alle Tests grün
- [ ] `dealScoringService.test.ts` — alle Tests grün
- [ ] `riskDetectionService.test.ts` — alle Tests grün
- [ ] `catalogMatcher.test.ts` — alle Tests grün
- [ ] `listingNormalizer.test.ts` — alle Tests grün

## API Mock Tests
- [ ] eBay Connector Mock liefert Listings
- [ ] BrickLink Connector Mock liefert Price Guide
- [ ] Scheduler Flow mit Mock-Daten komplett

## Datenvalidierung
- [ ] Preise korrekt normalisiert (EUR)
- [ ] totalPrice = price + shipping
- [ ] rawDataHash identisch bei gleichen Daten
- [ ] Duplikate werden erkannt

## Scoring Tests
- [ ] Risiko reduziert Score korrekt
- [ ] Positive Begriffe erhöhen Score
- [ ] Niedrige Match Confidence reduziert Score
- [ ] Versandkosten zerstören Margin korrekt
- [ ] Unvollständige Listings erkannt
- [ ] Custom/Fake wird hart bestraft
- [ ] Profitable Listings korrekt priorisiert

## Security
- [ ] Keine Secrets im Code
- [ ] .env.example vorhanden
- [ ] .gitignore enthält .env, node_modules, dist
- [ ] Input Validation auf API Routes

## Compliance
- [ ] Kein automatischer Kauf möglich
- [ ] Keine Massennachrichten
- [ ] Keine Off-Plattform-Deals
- [ ] Keine CAPTCHA-Umgehung
- [ ] Nur offizielle APIs
- [ ] AI drafted messages sind plattformkonform
