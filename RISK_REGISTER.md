# RISK REGISTER — LEGO Star Wars Deal Finder Agent

## Technische Risiken

| ID | Risiko | Schwere | Gegenmaßnahme |
|---|---|---|---|
| T1 | eBay API Rate Limits | Hoch | Exponential Backoff, Queue |
| T2 | BrickLink API Limits | Mittel | Caching, Rate Limiter |
| T3 | OAuth Token Expiry | Hoch | Auto-Refresh, TTL Cache |
| T4 | Firestore-Kosten | Mittel | Batch-Writes, Deduplizierung |

## Business-Risiken

| ID | Risiko | Schwere | Gegenmaßnahme |
|---|---|---|---|
| B1 | Falsche Preisbewertung | Hoch | Confidence Score, Human Gate |
| B2 | Custom/Fake LEGO | Hoch | Warnwörter, Risk Score |
| B3 | Lot-Bewertung ungenau | Mittel | Konservativ, "needs review" |
| B4 | Set-Nr falsch zugeordnet | Mittel | Confidence < 0.75 → Manual |

## Compliance-Risiken

| ID | Risiko | Schwere | Gegenmaßnahme |
|---|---|---|---|
| C1 | eBay ToS-Verstoß | Kritisch | Rate Limiting, offizielle API |
| C2 | Auto-Kauf | Kritisch | Architektonisch ausgeschlossen |
| C3 | Massennachrichten | Kritisch | Architektonisch ausgeschlossen |
| C4 | Off-Plattform-Deals | Kritisch | AI-Systemregeln |

## Datenschutz-Risiken

| ID | Risiko | Schwere | Gegenmaßnahme |
|---|---|---|---|
| D1 | API Keys im Code | Kritisch | .env, Secret Manager |
| D2 | PII in Logs | Mittel | Log-Sanitization |
