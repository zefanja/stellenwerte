# Stellenwerttraining

Web-App für tägliche 5-Minuten-Übungen zum Stellenwertverständnis (Klasse 5–7) mit FSRS-Wiederholungsplanung und Lehrer-Dashboard. Spezifikation: `Spezifikation Web-App Stellenwerttraining.md`.

## Stand

| M   | Inhalt                                                    | Stand                                                                   |
| --- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Gerüst, Datenmodell, Migrationen, Lehrer-Login, Gruppen/Schüler | fertig                                                                  |
| 2   | Schüler-Login mit Ziffernblock, Cookie, „Bist du das?“    | fertig, Playwright-Test im Handy-Format; Prüfung auf echtem Handy offen |
| 3   | Generatoren und Fehlertypen Wochen 1–3 mit Tests          | fertig, 8 Generatoren, je 200 Items pro Parametersatz geprüft           |
| 4   | Eingabekomponenten, SVG-Material, Animationen, Session-Flow | fertig, Playwright löst 10+5 Aufgaben nur mit Tipps in der unteren Hälfte; Prüfung auf echtem Handy offen |
| 5   | FSRS, Einführungsmodus, Freischaltung, Sessionaufbau      | fertig, 30-Tage-Simulation mit vier Schülerprofilen als Test            |
| 6   | Dashboard: Übersicht, Schülerprofil, Fehlerbilder, CSV    | fertig, Farbmatrix und „ohne Scrollen“ (1366×660, 1280×620) per Playwright geprüft |
| 7–8 | Code-PDF, Archivierung, Generatoren Woche 4–6, PWA        | offen                                                                   |

## Entwicklung

Voraussetzungen: Node ≥ 22, PostgreSQL 16 (Binärdateien unter `/usr/lib/postgresql/16/bin` im `PATH`).

```sh
npx npm@11 install        # npm 10.9 bricht hier mit „reading 'edgesOut'“ ab
# eigene DB-Instanz im Projektordner, nur Unix-Socket (wie auf Uberspace)
initdb -D .pgdata -U swt --auth=trust -E UTF8 --locale=C.UTF-8
mkdir -p .pgsock && npm run db:start
createdb -h $PWD/.pgsock -U swt stellenwert
cp .env.example .env      # DATABASE_URL, SECRET_KEY und ORIGIN eintragen
npm run teacher:create -- lehrer@schule.de
npm run dev               # Lehrer-Zugang unter /lehrer
```

`DATABASE_URL` wählt einen Socket-Ordner über `?host=/pfad` (siehe `src/lib/server/db/connection.js`). Migrationen liegen in `drizzle/` und laufen beim Serverstart. Schemaänderungen: `schema.ts` ändern, dann `npm run db:generate`.

Tests: `npx vitest run` (Generatoren, Layout, Rate Limit), `npx playwright test` (Login und komplette Session im Pixel-7-Format gegen die Datenbank `stellenwert_test`, vorher `createdb -h $PWD/.pgsock -U swt stellenwert_test`), `npm run check`, `npx eslint .`

## Aufbau

- `src/lib/skills/`: Skill-Katalog und Aufgabengeneratoren, reine Funktionen, laufen auf Server und Client
  - `katalog.ts`: 12 Skills mit Woche, Voraussetzungen, Eingabetyp und Zielzeit; Wochen 4–5 haben noch `generator: null`
  - `generatoren/<skill_id>.ts`: `generate(params, seed)`, `bewerte(item, antwort)` und `baue(...)` für feste Beispiele
  - `fehler.ts`: alle `error_tag`s mit Klartext fürs Dashboard
- `src/lib/material/`: SVG-Material, Layout der Stellenwerttafel (`layout.ts`, getestet), animiertes Modell mit Bündeln, Entbündeln, Legen und „Material zu Zahl“ (`modell.svelte.ts`), Gesten
- `src/lib/aufgaben/`: eine Komponente je Eingabetyp, jeweils mit Versuch, Hilfe (zweiter Versuch mit Material) und Lösungsanimation
- `src/lib/server/planung/`: reine Funktionen ohne Datenbank, alle getestet
  - `zeit.ts`: Kalendertage in Europe/Berlin (auch an Tagen der Zeitumstellung)
  - `fsrs.ts`: Bewertung einer Runde aus fünf Aufgaben, FSRS-Update über `ts-fsrs`
  - `sessionplan.ts`: Sessionaufbau, Freischaltung, Verlängerung
  - `simulation.ts`: simulierter Schüler; `simulation.test.ts` ist die Abnahme von M5
- `src/routes/ueben/`: Session-Ablauf; `src/routes/api/session/*`, `api/attempt`: signierte Aufträge, serverseitige Bewertung
- `src/lib/server/auth/`: Codes (Argon2id-Hash plus HMAC-Kurzindex), signierte Cookies, Rate Limit
- `src/routes/lehrer/`: Lehrer-Oberfläche; `gruppen/[id]` Übersicht (Farbmatrix), `gruppen/[id]/verwaltung`, `schueler/[id]` Profil
- `src/lib/server/dashboard/daten.ts`: Abfragen fürs Dashboard; `src/lib/dashboard/regeln.ts`: Zellfarbe, Median, CSV (getestet)
- `src/routes/api/teacher/gruppen/[id]/stand.csv` und `fehler.csv`: Exporte

## Geklärte offene Entscheidungen (25.09.2026)

- **Material wird als SVG gezeichnet**, nicht als CSS-Raster.
- **Kinder können eine Session freiwillig verlängern.** Nach der regulären Session (8–12 Aufgaben) bietet die App eine Verlängerung an; sie endet nicht hart nach zwölf Aufgaben.

## Entscheidungen, die von der Spezifikation abweichen oder sie auslegen

- **Rate Limit zählt nur Fehlversuche.** Sonst sperrt sich eine Klasse hinter einer Schul-IP beim gemeinsamen Anmelden selbst.
- **Sessions ohne eigene Tabelle.** Cookies sind HMAC-signiert (Lehrkraft 12 h, Schüler 180 Tage). Schüler-Cookies, die vor `code_last_rotated` ausgestellt wurden, werden abgewiesen. So bleibt es bei sechs Tabellen, und ein Codewechsel meldet sofort ab.
- **Zusätzliche Spalte `student.code_index`** für den HMAC-Kurzindex aus der Spezifikation.
- **Schüler-Login zweistufig:** `POST /api/login` mit `{ code }` liefert nur das Label für „Bist du das?“; erst `{ code, bestaetigt: true }` setzt das Cookie.
- **Ziffernblock bleibt gesperrt, bis die Seite interaktiv ist**, damit auf langsamen Handys keine Tipps verloren gehen.
- **Einhändig:** Alles, was man im Material (obere Hälfte) antippen, ziehen oder lange drücken kann, geht auch über Knöpfe unten: „10 bündeln“ wählt die fehlenden Würfel sichtbar selbst aus, die Tauschfläche hat je Spalte „bündeln“ und „tauschen“, der Vorrat legt per Tipp.
- **Server bewertet selbst.** Jeder Auftrag ist per HMAC an die Session gebunden; `/api/attempt` generiert das Item aus Skill, Parametern und Seed neu und bewertet die Antwort. Die Bewertung des Clients dient nur der sofortigen Rückmeldung.
- **Zweiter Versuch = `hint_used`.** Nach einer falschen Antwort kommt dieselbe Aufgabe mit Material zum Tauschen; diese Antwort wird mit `hint_used = true` gespeichert. `session.item_count` und `correct_count` zählen nur erste Versuche.
- **Verlängerung:** Nach 10 Aufgaben „Noch 5 Aufgaben“, höchstens dreimal (`MAX_VERLAENGERUNGEN`), in derselben Session.
- **Bewegung an/aus** auf der Startseite, gespeichert auf dem Gerät; Standard folgt `prefers-reduced-motion`.
- **Noch nicht in M4:** `StrahlRegler` und `Auswahlkarten` kommen mit den Generatoren der Woche 5, die Stellenwechsel-Animation (399 + 1) mit `stelle_veraendern` (Woche 4), jeweils in M8. Antworten ohne Netz werden bisher nur im Speicher wiederholt; die Ablage auf dem Gerät folgt mit dem Offline-Puffer (M8).
- **FSRS tagesgenau:** `ts-fsrs` ohne Kurzzeitschritte und ohne Zufallsstreuung, `request_retention` 0,9, `maximum_interval` 120. Fällig ist eine Karte ab Mitternacht (Berlin) ihres Tages; nach Again immer am Folgetag (ts-fsrs selbst würde teils zwei Tage geben).
- **Einführung:** Beim ersten Einplanen eines neuen Skills entsteht seine Karte mit `state = 0` und `introduced_at`. Die Prüfrunde macht daraus erst ab Hard eine FSRS-Karte; sonst bleibt der Skill im Einführungsmodus und kommt am nächsten Tag wieder. Es läuft höchstens eine Einführung zur Zeit.
- **Sessionaufbau:** Aufwärmen 2 Aufgaben, bei zwei fälligen Karten nur 1, damit es bei höchstens 12 Aufgaben bleibt. Der Einführungsblock (3 begleitete + 5 Prüfung, dazu 2 Beispiele zum Zuschauen) kommt nur, wenn er noch passt, also praktisch nur an Tagen ohne fällige Karte. Unter 8 Aufgaben wird mit freiem Üben aufgefüllt (ohne FSRS-Wirkung).
- **Bewertung am Sessionende**, in einer Transaktion und idempotent. Liegengebliebene Sessions (App geschlossen) werden vor der nächsten Session abgeschlossen; unvollständige Runden bleiben ohne Wirkung, die Karte bleibt fällig.
- **Verlängerung:** nächste fällige Karte, die heute noch nicht dran war; sonst freies Üben.
- **Rot = zweimal Again in Folge**, gezählt in `card.again_in_folge` (auch nicht bestandene Prüfrunden der Einführung). Rot hat Vorrang vor Grün. Jede Zelle trägt zusätzlich ein Zeichen (✓ · !), damit sie ohne Rot-Grün-Sehen lesbar ist.
- **Kennzahlen über 7 Tage:** aktiv = mindestens eine Antwort; Median der Sessions über alle Kinder der Gruppe, auch die ohne Session.
- **Fehlerbilder über 4 Wochen**, die Liste der letzten zehn Fehlversuche ohne Zeitgrenze (bis zur Löschung nach 12 Monaten). Die Aufgabe wird aus Skill, Parametern und Seed neu erzeugt und als Text gezeigt.
- **CSV für deutsches Excel:** Semikolon, Dezimalkomma, UTF-8 mit BOM; Zellen mit führendem `=`, `+`, `-`, `@` werden entschärft.
- **`ORIGIN` ist in Produktion Pflicht** (z. B. `https://stellenwert.example.de`): adapter-node nimmt sonst `https` an, und SvelteKit weist Formulare (Lehrer-Login) als Cross-Site ab.
- **Platz im Schülerprofil:** Bei 8 Skills bleibt es bei 1366×660 ohne Scrollen. Mit den 12 Skills aus M8 wird die Skill-Liste um vier Zeilen länger; dann dort zweispaltig oder kompakter darstellen.
- **Lehrer-Oberfläche nutzt SvelteKit-Form-Actions** statt `/api/teacher/*`. Die JSON-Endpunkte kommen dazu, wenn sie gebraucht werden (Exporte).
- **Zusätzliche Fehlertypen** über die Beispieltabelle hinaus, z. B. `nullstelle_fehlt`, `verkettet` (300 und 5 → 3005), `gerundet`, `kein_entbuendeln`. Liste in `fehler.ts`.
- **`tauschen_entbuendeln`:** Die Antwort ist der Materialzustand nach dem Tauschen. Richtig ist jeder wertgleiche Zustand, in dem jede Spalte für die Wegnahme reicht. Mehr zu tauschen als nötig gilt nicht als Fehler.
- **`zahl_zu_material`:** Jede wertgleiche Legung zählt als richtig, auch eine nicht normierte (2 H 10 Z 5 E für 305).
- **Bereichsparameter** sind Tupel `[min, max]` (`stellen`, `zahlenraum`, `zahl`, `abzug`). Neu dazu kamen `max_lose_einer` (Bildschirmplatz) und `max_ueberschuss`.
- **Seeds** liegen in 0 … 2³¹−1, weil `attempt.seed` ein `integer` ist.
