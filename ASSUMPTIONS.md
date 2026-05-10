# ASSUMPTIONS — LEGO Star Wars Deal Finder Agent

## API Keys & Credentials

| Annahme | Begründung |
|---|---|
| eBay API Keys sind noch nicht vorhanden | Mock-Modus wird bereitgestellt |
| BrickLink API Keys sind noch nicht vorhanden | Mock-Modus wird bereitgestellt |
| Rebrickable API Key ist optional | Graceful Fallback implementiert |
| Gemini API Key ist optional für MVP | Mock AI Review Service |
| Google Cloud Projekt existiert noch nicht | Lokale Entwicklung zuerst |
| Firestore im Emulator-Modus für Entwicklung | Production-Modus via ENV |

## Architektur

| Annahme | Begründung |
|---|---|
| Express.js als HTTP Framework (nicht Fastify) | Breiter verbreitet, mehr Middleware-Ökosystem |
| Firestore als Primärdatenbank | Google Stack-Kompatibilität, schemaless |
| Port 8080 als Default | Cloud Run Standard |
| EUR als Default-Währung | Zielmarkt Deutschland |
| EBAY_DE als Default-Marketplace | Primärer Suchmarkt |
| Node.js >= 18 vorausgesetzt | Modern LTS, native fetch |

## Business Logic

| Annahme | Begründung |
|---|---|
| Versandkosten werden zum Preis addiert | Total Cost = Item Price + Shipping |
| BrickLink 6M sold average hat höchstes Gewicht | Marktüblich für Bewertung |
| Deal Score 80+ = buy_review (menschliche Prüfung) | Konservativ, kein Auto-Kauf |
| Risk Score kann bis zu -50 Deal-Score-Punkte abziehen | Schutz vor Fehlkäufen |
| Catalog Match < 0.75 → "needs manual review" | Konservativ |
| Import-Steuern innerhalb EU werden ignoriert (MVP) | EU-Binnenmarkt |
| Plattformgebühren als Pauschal 0% für MVP | Können später konfiguriert werden |

## Umgebung

| Annahme | Begründung |
|---|---|
| Windows-Entwicklungsumgebung | Nutzer-OS |
| PowerShell als Shell | Standard Windows |
| npm als Package Manager | Kein Hinweis auf pnpm/yarn |
| Lokale Entwicklung vor Cloud-Deployment | Iterative Entwicklung |
| Google Sheets API via Service Account | Standard für Server-zu-Server |

## Fehlende Konfiguration

| Variable | Standard-Annahme |
|---|---|
| `PORT` | 8080 |
| `NODE_ENV` | development |
| `DEFAULT_CURRENCY` | EUR |
| `DEFAULT_REGION` | EU |
| `DEFAULT_COUNTRY` | DE |
| `MIN_DEAL_SCORE_NOTIFY` | 80 |
| `NOTIFICATION_MODE` | none |
| `EBAY_MARKETPLACE_ID` | EBAY_DE |
