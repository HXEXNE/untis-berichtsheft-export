# 📋 Berichtsheft Export

Chrome-Extension zum automatischen Export von Stundenplänen aus [WebUntis](https://webuntis.com) ins Berichtsheft-Format.

Entwickelt für Auszubildende, die ihr Berichtsheft mit Berufsschul-Einträgen füllen müssen und keine Lust haben, jede Woche manuell Fächer und Themen abzutippen.

![Version](https://img.shields.io/badge/version-2.1-orange)
![Chrome](https://img.shields.io/badge/Chrome-Extension-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Ein Klick** — Extension-Icon klicken, Wochen auswählen, exportieren, in Word einfügen
- **Auto-Login** — Credentials werden beim ersten Start eingegeben und lokal gespeichert
- **Automatischer Wochen-Scan** — Findet alle Schulwochen im Schuljahr, zeigt nur Wochen mit Lehrereinträgen
- **Mehrfach-Export** — Mehrere Wochen auf einmal exportieren
- **Konfigurierbar** — Fächer-Umbenennung, Aufzählungszeichen, Überschriften, Schule
- **Funktioniert überall** — Kein offener WebUntis-Tab nötig

## Installation

### Variante A: Release herunterladen (empfohlen)

1. Lade die neueste `berichtsheft-extension.zip` von der [Releases-Seite](../../releases) herunter
2. Entpacke die ZIP in einen Ordner
3. Öffne `chrome://extensions` in Chrome
4. Aktiviere oben rechts den **Entwicklermodus**
5. Klicke auf **"Entpackte Erweiterung laden"**
6. Wähle den entpackten Ordner aus

### Variante B: Repository klonen

```bash
git clone https://github.com/DEIN-USERNAME/berichtsheft-export.git
```

Dann in `chrome://extensions` → Entwicklermodus → "Entpackte Erweiterung laden" → den geklonten Ordner auswählen.

> **Tipp:** Klicke auf das Puzzle-Icon 🧩 in der Chrome-Toolbar und pinne die Extension an, damit der Button immer sichtbar ist.

## Benutzung

1. Klicke auf das **Extension-Icon** in der Toolbar
2. Beim ersten Start: **Benutzername und Passwort** eingeben (wird lokal im Browser gespeichert)
3. Die Extension scannt automatisch das Schuljahr und zeigt alle **Schulwochen mit Lehrereinträgen**
4. Gewünschte Wochen auswählen → **"Exportieren"**
5. **"In Zwischenablage kopieren"** → In Word/Dokument einfügen

### Ausgabeformat

```
Montag, 02.03.2026 - Berufsschule

•   WSK: Thema der Stunde

•   Englisch: Thema der Stunde

 

Dienstag, 03.03.2026 - Berufsschule

•   LF 6: Thema der Stunde

•   LF 8: Thema der Stunde
```

## Einstellungen

Klicke auf das **Zahnrad-Icon ⚙️** oben rechts im Popup, um die Einstellungsseite zu öffnen:

| Einstellung | Beschreibung | Standard |
|---|---|---|
| **WebUntis-URL** | URL deiner Schule | `https://meineschule.webuntis.com` |
| **Schulkürzel** | Kürzel nach `school=` in der URL | `meineschule` |
| **Aufzählungszeichen** | •, -, ◦, kein Zeichen, oder eigenes | `•` |
| **Tages-Überschrift** | Text nach dem Datum | `Berufsschule` |
| **Fächer-Umbenennung** | WebUntis-Name → Berichtsheft-Name | siehe unten |

### Standard Fächer-Mapping

| WebUntis | Berichtsheft |
|---|---|
| EN | Englisch |
| DE | Deutsch |
| MA | Mathematik |

Fächer, die nicht in der Tabelle stehen, werden unverändert übernommen. Eigene Mappings lassen sich in den Einstellungen hinzufügen.

## Für andere Schulen anpassen

Die Extension funktioniert mit jeder WebUntis-Instanz. In den Einstellungen einfach anpassen:

1. **WebUntis-URL** auf die eigene Schule ändern (z.B. `https://meineschule.webuntis.com`)
2. **Schulkürzel** anpassen (steht in der URL nach `school=`)
3. **Fächer-Mapping** an die eigenen Fächernamen anpassen
4. **Schuljahr-ID** ggf. anpassen (in der Regel `29` für 2025/2026)

## Technische Details

### Verwendete APIs

- `POST /WebUntis/jsonrpc.do` — Authentifizierung (JSON-RPC)
- `GET /WebUntis/api/token/new` — JWT Token
- `GET /WebUntis/api/public/timetable/weekly/data` — Wöchentlicher Stundenplan
- `GET /WebUntis/api/rest/view/v2/calendar-entry/detail` — Stundendetails mit Themen

### Datenspeicherung

Alle Daten werden ausschließlich **lokal im Browser** gespeichert (`chrome.storage.local`):

- Login-Credentials (Base64-kodiert)
- Einstellungen (Fächer-Mapping, Formatierung, Schule)

Es werden keine Daten an Dritte gesendet.

### Berechtigungen

- `storage` — Zum Speichern von Einstellungen und Credentials
- `host_permissions: *.webuntis.com` — Zum Zugriff auf die WebUntis-API

## Projektstruktur

```
berichtsheft-export/
├── manifest.json      # Chrome Extension Manifest (v3)
├── popup.html         # Popup UI (Login, Wochenauswahl, Export)
├── popup.js           # Hauptlogik (Auth, Scan, Export)
├── settings.html      # Einstellungsseite
├── settings.js        # Einstellungslogik
├── shared.js          # Geteilte Funktionen und Defaults
├── icon48.png         # Toolbar-Icon
└── icon128.png        # Extension-Icon
```

## Lizenz

[MIT](LICENSE) — Frei nutzbar, auch kommerziell. Siehe [LICENSE](LICENSE) für Details.
