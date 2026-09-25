# Stellenwerttraining

Web-App für tägliche 5-Minuten-Übungen zum Stellenwertverständnis (Klasse 5–7) mit FSRS-Wiederholungsplanung und Lehrer-Dashboard. Spezifikation: `Spezifikation Web-App Stellenwerttraining.md`.

## Stand

| M   | Inhalt                                                    | Stand                                                                   |
| --- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Gerüst, Datenmodell, Migrationen, Lehrer-Login, Gruppen/Schüler | fertig                                                                  |
| 3   | Generatoren und Fehlertypen Wochen 1–3 mit Tests          | fertig, 8 Generatoren, je 200 Items pro Parametersatz geprüft           |
| 2, 4–8 | Schüler-Login, Oberfläche, FSRS, Dashboard, PDF, PWA  | offen                                                                   |

## Entwicklung

Voraussetzungen: Node ≥ 22, PostgreSQL 16 (Binärdateien unter `/usr/lib/postgresql/16/bin` im `PATH`).

```sh
npx npm@11 install        # npm 10.9 bricht hier mit „reading 'edgesOut'“ ab
# eigene DB-Instanz im Projektordner, nur Unix-Socket (wie auf Uberspace)
initdb -D .pgdata -U swt --auth=trust -E UTF8 --locale=C.UTF-8
mkdir -p .pgsock && npm run db:start
createdb -h $PWD/.pgsock -U swt stellenwert
cp .env.example .env      # DATABASE_URL und SECRET_KEY eintragen
npm run teacher:create -- lehrer@schule.de
npm run dev               # Lehrer-Zugang unter /lehrer
```

`DATABASE_URL` wählt einen Socket-Ordner über `?host=/pfad` (siehe `src/lib/server/db/connection.js`). Migrationen liegen in `drizzle/` und laufen beim Serverstart. Schemaänderungen: `schema.ts` ändern, dann `npm run db:generate`.

Tests: `npx vitest run` (Generatoren, Rate Limit), `npm run check`, `npx eslint .`

## Aufbau

- `src/lib/skills/`: Skill-Katalog und Aufgabengeneratoren, reine Funktionen, laufen auf Server und Client
  - `katalog.ts`: 12 Skills mit Woche, Voraussetzungen, Eingabetyp und Zielzeit; Wochen 4–5 haben noch `generator: null`
  - `generatoren/<skill_id>.ts`: `generate(params, seed)`, `bewerte(item, antwort)` und `baue(...)` für feste Beispiele
  - `fehler.ts`: alle `error_tag`s mit Klartext fürs Dashboard
- `src/lib/server/auth/`: Codes (Argon2id-Hash plus HMAC-Kurzindex), signierte Cookies, Rate Limit
- `src/routes/lehrer/`: Lehrer-Oberfläche

## Geklärte offene Entscheidungen (25.09.2026)

- **Material wird als SVG gezeichnet**, nicht als CSS-Raster.
- **Kinder können eine Session freiwillig verlängern.** Nach der regulären Session (8–12 Aufgaben) bietet die App eine Verlängerung an; sie endet nicht hart nach zwölf Aufgaben.

## Entscheidungen, die von der Spezifikation abweichen oder sie auslegen

- **Rate Limit zählt nur Fehlversuche.** Sonst sperrt sich eine Klasse hinter einer Schul-IP beim gemeinsamen Anmelden selbst.
- **Sessions ohne eigene Tabelle.** Cookies sind HMAC-signiert (Lehrkraft 12 h, Schüler 180 Tage). Schüler-Cookies, die vor `code_last_rotated` ausgestellt wurden, werden abgewiesen. So bleibt es bei sechs Tabellen, und ein Codewechsel meldet sofort ab.
- **Zusätzliche Spalte `student.code_index`** für den HMAC-Kurzindex aus der Spezifikation.
- **Lehrer-Oberfläche nutzt SvelteKit-Form-Actions** statt `/api/teacher/*`. Die JSON-Endpunkte kommen dazu, wenn sie gebraucht werden (Exporte).
- **Zusätzliche Fehlertypen** über die Beispieltabelle hinaus, z. B. `nullstelle_fehlt`, `verkettet` (300 und 5 → 3005), `gerundet`, `kein_entbuendeln`. Liste in `fehler.ts`.
- **`tauschen_entbuendeln`:** Die Antwort ist der Materialzustand nach dem Tauschen. Richtig ist jeder wertgleiche Zustand, in dem jede Spalte für die Wegnahme reicht. Mehr zu tauschen als nötig gilt nicht als Fehler.
- **`zahl_zu_material`:** Jede wertgleiche Legung zählt als richtig, auch eine nicht normierte (2 H 10 Z 5 E für 305).
- **Bereichsparameter** sind Tupel `[min, max]` (`stellen`, `zahlenraum`, `zahl`, `abzug`). Neu dazu kamen `max_lose_einer` (Bildschirmplatz) und `max_ueberschuss`.
- **Seeds** liegen in 0 … 2³¹−1, weil `attempt.seed` ein `integer` ist.
