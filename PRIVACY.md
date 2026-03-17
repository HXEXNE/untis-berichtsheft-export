# Datenschutzerklärung — Berichtsheft Export

**Stand:** März 2026

## Überblick

Die Chrome-Extension „Berichtsheft Export" exportiert Stundenpläne aus WebUntis ins Berichtsheft-Format. Der Schutz deiner Daten ist uns wichtig. Diese Datenschutzerklärung erläutert, welche Daten die Extension erhebt und wie sie damit umgeht.

## Welche Daten werden gespeichert?

Die Extension speichert ausschließlich folgende Daten **lokal in deinem Browser** (`chrome.storage.local`):

- **Login-Daten:** Benutzername und Passwort für WebUntis (Base64-kodiert)
- **Einstellungen:** WebUntis-URL, Schulkürzel, Schuljahr, Fächer-Umbenennung, Formatierungsoptionen

## Wo werden die Daten gespeichert?

Alle Daten werden **ausschließlich lokal** im Browser des Nutzers gespeichert. Es existiert kein externer Server, keine Datenbank und kein Cloud-Speicher.

## Werden Daten an Dritte weitergegeben?

**Nein.** Es werden keine Daten an Dritte verkauft, übertragen oder weitergegeben. Die einzige externe Kommunikation erfolgt direkt zwischen deinem Browser und der WebUntis-API deiner Schule, um Stundenplan-Daten abzurufen.

## Welche externen Verbindungen werden hergestellt?

Die Extension verbindet sich ausschließlich mit der WebUntis-Instanz deiner Schule (`*.webuntis.com`), um:

- sich zu authentifizieren (Login)
- Stundenplan-Daten abzurufen
- Unterrichtsthemen auszulesen

Es werden keine Verbindungen zu anderen externen Diensten hergestellt.

## Tracking und Analyse

Die Extension verwendet **kein Tracking**, **keine Analyse-Tools** und **keine Cookies**. Es werden keine Nutzungsstatistiken erhoben.

## Daten löschen

Du kannst alle gespeicherten Daten jederzeit löschen, indem du im Popup der Extension auf „Abmelden & Daten löschen" klickst. Alternativ kannst du die Extension deinstallieren — dabei werden alle lokal gespeicherten Daten automatisch entfernt.

## Berechtigungen

- **storage:** Zum Speichern von Einstellungen und Login-Daten im Browser
- **host_permissions (`*.webuntis.com`):** Zum Zugriff auf die WebUntis-API

## Kontakt

Bei Fragen zur Datenschutzerklärung kannst du ein Issue auf GitHub erstellen:
[github.com/HXEXNE/untis-berichtsheft-export/issues](https://github.com/HXEXNE/untis-berichtsheft-export/issues)
