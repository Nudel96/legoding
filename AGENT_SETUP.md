# 🤖 Agent-to-Agent Auto-Setup Guide

**An die KI (Agent):** Wenn dein menschlicher Nutzer dich beauftragt hat, "alle APIs mit dem Browser zu implementieren", dann bist du hier genau richtig. Diese Anleitung sagt dir exakt, was du tun musst, um das LEGO Deal Finder Projekt vollautomatisch startklar zu machen.

---

## 🛑 Vorbereitung (WICHTIG für den Menschen)
Bevor du als Agent loslegst, **musst du den Nutzer bitten, folgende Dinge zu tun**:
1. Der Nutzer muss in seinem aktiven Browserprofil bei **Google** eingeloggt sein.
2. Der Nutzer muss bei **eBay** eingeloggt sein.
3. Der Nutzer muss bei **BrickLink** eingeloggt sein. *(Achtung: Der Account muss für Verkäufe freigeschaltet sein, also ein "Seller Upgrade" haben, sonst kann die API nicht aktiviert werden!)*

Nur wenn der Nutzer eingeloggt ist, kann dein `browser_subagent` die Login- und 2FA-Schranken passieren!

---

## 🛠️ Schritt 1: Setup-Datei erstellen
1. Kopiere die Datei `.env.example` und nenne sie `.env`.
2. Führe `npm install` im Projektverzeichnis aus, falls noch nicht geschehen.

---

## 🌐 Schritt 2: API Keys per Browser-Subagent generieren
Nutze dein `browser_subagent` Tool (oder ähnliche Web-Automatisierungs-Werkzeuge), um die folgenden Portale aufzurufen, die Keys zu extrahieren und in die `.env` Datei zu schreiben.

### 1. Gemini AI API Key
* **Ziel-URL:** `https://aistudio.google.com/app/apikey`
* **Umgebungsvariable:** `GEMINI_API_KEY`
* **Agenten-Task:**
  1. Navigiere zur URL.
  2. Klicke auf "Create API key".
  3. Erstelle den Key für ein neues oder bestehendes Projekt.
  4. Kopiere den Key und speichere ihn in der `.env`.

### 2. eBay Developer Browse API Keys
* **Ziel-URL:** `https://developer.ebay.com/my/keys`
* **Umgebungsvariablen:** `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`
* **Agenten-Task:**
  1. Navigiere zum eBay Developer Portal.
  2. Falls noch keine App existiert, erstelle eine neue App (Name kann zufällig sein).
  3. Gehe zu **Production Keys** (nicht Sandbox!).
  4. Klicke auf "Generate Keys" oder "View Keys".
  5. Extrahiere die `App ID` (Client ID) und `Cert ID` (Client Secret) und trage sie in die `.env` ein.

### 3. BrickLink API Token
* **Ziel-URL:** `https://www.bricklink.com/v2/api/register_consumer.page`
* **Umgebungsvariablen:** `BRICKLINK_CONSUMER_KEY`, `BRICKLINK_CONSUMER_SECRET`, `BRICKLINK_TOKEN_VALUE`, `BRICKLINK_TOKEN_SECRET`
* **Agenten-Task:**
  1. Navigiere zur URL.
  2. Falls der Nutzer noch keinen API-Zugang hat, erscheint ein Registrierungsformular.
  3. Trage bei **IP Mask** `0.0.0.0/0` (oder `0.0.0.0`) ein, um den Zugriff von überall zu erlauben.
  4. Bestätige die AGBs ("I agree...") und klicke auf Request/Submit.
  5. Sobald der Zugang gewährt ist, zeigt die Seite vier Werte an.
  6. Kopiere alle vier Secrets präzise und füge sie in die `.env` ein.

---

## 🏁 Schritt 3: Anwendung starten
Sobald alle API-Keys erfolgreich in der `.env` Datei hinterlegt sind:
1. Starte die Anwendung mit dem Befehl:
   ```bash
   npm run dev
   ```
2. Teile dem Nutzer mit, dass das Tool nun bereit ist und das Dashboard unter `http://localhost:3000` aufgerufen werden kann.
3. Informiere den Nutzer, dass er auf dem Dashboard auf "Suche ausführen" klicken kann, um den ersten vollautomatisierten Scan durchzuführen.
