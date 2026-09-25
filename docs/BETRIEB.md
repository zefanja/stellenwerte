# Betrieb auf Uberspace

Die App läuft als ein Node-Prozess unter supervisord, die Datenbank als eigene PostgreSQL-Instanz im selben Benutzerkonto, erreichbar nur über den Unix-Socket. Kein Docker, kein Root.

**Node-Hauptversion: 22.** Uberspace pflegt Node selbst. Nach einem Wechsel mit `uberspace tools version use node 22` den Dienst neu starten: `supervisorctl restart stellenwert`.

## Einmalig einrichten

1. **Node festlegen:** `uberspace tools version use node 22`
2. **PostgreSQL 16** nach dem Uberlab-Guide `guide_postgresql` installieren und mit `initdb` im Homeverzeichnis anlegen. Den Dienst aus [`deploy/services.d/postgresql.ini`](../deploy/services.d/postgresql.ini) nach `~/etc/services.d/` kopieren, Pfade anpassen, dann `supervisorctl reread && supervisorctl update`. Die Instanz lauscht nicht auf TCP, nur auf dem Socket in `~/tmp`.
3. **Datenbank anlegen:** `createdb -h ~/tmp stellenwert`
4. **Code holen:**
   ```sh
   cd ~ && git clone <repo-url> stellenwerttraining && cd stellenwerttraining
   cp .env.example .env && chmod 600 .env
   ```
   In `.env` eintragen:
   | Variable | Wert |
   | --- | --- |
   | `DATABASE_URL` | `postgres://<user>@localhost/stellenwert?host=/home/<user>/tmp` |
   | `SECRET_KEY` | 32 Byte zufällig: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `ORIGIN` | `https://<domain>`, sonst lehnt SvelteKit den Lehrer-Login als Cross-Site ab |
   | `ADDRESS_HEADER`, `XFF_DEPTH` | `X-Forwarded-For` und `1`, sonst teilen sich alle Kinder hinter dem Proxy eine IP für das Login-Rate-Limit |
   | `HOST`, `PORT` | `0.0.0.0` und ein freier Port, z. B. `3000` |

   `SECRET_KEY` nie ändern, solange Codes im Umlauf sind: Er steckt im Suchindex der Codes und in den Cookies.
5. **Bauen:** `npx -y npm@11 ci && npm run build` (npm 10.9 bricht bei diesem Abhängigkeitsbaum ab)
6. **Dienst:** [`deploy/services.d/stellenwert.ini`](../deploy/services.d/stellenwert.ini) nach `~/etc/services.d/` kopieren, `supervisorctl reread && supervisorctl update`. Migrationen laufen beim Start.
7. **Web:** `uberspace web backend set / --http --port 3000`, dann `uberspace web domain add <domain>` und DNS setzen. HTTPS stellt Uberspace über Let's Encrypt bereit und erzwingt es.
8. **Erste Lehrkraft:** `npm run teacher:create -- lehrer@schule.de`
9. **Backups und Aufräumen:**
   ```sh
   mkdir -p ~/.config/stellenwert ~/logs
   head -c 48 /dev/urandom | base64 > ~/.config/stellenwert/backup-passphrase
   chmod 600 ~/.config/stellenwert/backup-passphrase
   crontab -e   # Zeilen aus deploy/crontab.txt übernehmen
   ```
   Die Passphrase zusätzlich getrennt vom Server aufbewahren (z. B. ausgedruckt im Schulsafe). Ohne sie ist jedes Backup wertlos.
10. **Prüfen:** `curl https://<domain>/healthz` antwortet `ok`.

## Neue Version einspielen

```sh
~/stellenwerttraining/deploy/aktualisieren.sh
```

Das Skript holt den Code, baut, startet den Dienst neu und prüft `/healthz`.

## Backup zurückspielen

```sh
gpg -d --pinentry-mode loopback --passphrase-file ~/.config/stellenwert/backup-passphrase \
    ~/backups/stellenwert/stellenwert-JJJJ-MM-TT_HHMM.dump.gpg \
  | pg_restore -h ~/tmp -d stellenwert --clean --if-exists
supervisorctl restart stellenwert
```

## Fehlersuche

| Symptom | Ursache |
| --- | --- |
| Lehrer-Login: „Cross-site POST form submissions are forbidden“ | `ORIGIN` fehlt oder stimmt nicht mit der Domain überein |
| Alle Kinder zugleich „Kurz warten“ | `ADDRESS_HEADER`/`XFF_DEPTH` fehlen, alle erscheinen mit der IP des Proxys |
| Seite nicht erreichbar | `supervisorctl status`, Log: `supervisorctl tail -f stellenwert` |
| Codekarten-PDF „abgelaufen“ | Klartext-Codes liegen nur 15 Minuten im Speicher und nicht über einen Neustart hinaus: Codes neu erzeugen |

Login-Versuche (Lehrkraft und Schüler) stehen als JSON-Zeilen im Log des Dienstes.

## Datenschutz: vor dem Einsatz

- Auftragsverarbeitungsvertrag mit Uberspace abschließen (Rechenzentrum in Deutschland).
- Schuldatenschutzbeauftragten einbeziehen, Verzeichnis von Verarbeitungstätigkeiten anlegen. Ob eine Einwilligung der Erziehungsberechtigten nötig ist, entscheidet die Schule.
- Als Label nur Kürzel verwenden; die Zuordnung zu Namen führt die Lehrkraft auf Papier.
- Auskunft und Löschung: unter „Verwaltung“ je Schüler „Daten (JSON)“ und „Löschen“.
- Antworten werden nach 12 Monaten gelöscht (Crontab), Karten bleiben.
- Keine Dritten: keine externen Schriften, CDNs, Analytics. Die Content-Security-Policy lässt nur Inhalte vom eigenen Server zu.
- Lehrer-Sessions laufen nach 12 Stunden ab.
- **Offen:** Zwei-Faktor-Option für Lehrkräfte (Vorschlag: TOTP).
