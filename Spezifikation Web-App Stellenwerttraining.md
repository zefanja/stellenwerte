# Spezifikation: Web-App Stellenwerttraining

Sep 25, 2026 · @Mr. Kanister

Bau-Spezifikation für ein LLM. Die App trainiert Stellenwertverständnis in 5-Minuten-Einheiten auf dem Handy, plant Wiederholungen mit FSRS und gibt der Lehrkraft ein Dashboard.

## Ziel und Rahmen

Die App ersetzt das tägliche Hausaufgabenblatt des sechswöchigen Förderplans durch eine Handy-Übung von fünf bis acht Minuten. Sie trainiert Stellenwertverständnis, plant Wiederholungen mit FSRS und meldet der Lehrkraft, wo ein Kind hängt.

**Nutzergruppen:**

- **Schüler**, Klasse 5 bis 7, Handy im Hochformat, oft mit schwachem Lesevermögen. Login per Code, keine E-Mail, kein Passwort, keine Tastatureingabe.
- **Lehrkraft**, Desktop oder Tablet. Legt Gruppen und Schüler an, druckt Codekarten, sieht Fortschritt und Fehlerbilder.

**Kernentscheidungen, die den Rest der Spezifikation bestimmen:**

1. **Aufgaben werden generiert, nicht gespeichert.** Jeder Skill hat einen Generator mit Parametern und einem Seed. Dadurch gibt es unbegrenzt Varianten, und FSRS terminiert den Skill, nicht ein einzelnes Item.
2. **Eingabe ausschließlich per Touch.** Kein Textfeld, keine Bildschirmtastatur des Systems. Jede Antwort entsteht durch Tippen, Ziehen oder Schieben. Das ist Pflicht, nicht Komfort: Die Zielgruppe scheitert sonst an der Bedienung statt an der Mathematik.
3. **Falsche Antworten werden klassifiziert.** Jeder Generator liefert erwartbare Fehlantworten mit Fehlertyp mit, etwa „Ziffer statt Bündel gelesen“. Das ist die eigentliche Leistung für die Lehrkraft.
4. **Material vor Symbol.** Jeder Skill hat eine Darstellung mit Zehnersystemmaterial, und der Wechsel zwischen Material und Zahl wird animiert, nicht nur nebeneinandergestellt.

**Nicht-Ziele:** Keine Noten, keine Ranglisten zwischen Kindern, keine Punkte-Shops, keine Werbung, keine Eltern-Accounts, keine offene Registrierung, kein Chat, kein Mehrspieler. Die App deckt Stellenwertverständnis ab, nicht das gesamte Arithmetiktraining.

## Technik-Stack und Architektur

Ein Repository, ein App-Dienst und eine PostgreSQL-Instanz im selben Benutzerkonto. Die App läuft als Node-Prozess auf Uberspace, ohne Container und ohne Root-Rechte.

| Bereich      | Wahl                                                                   | Begründung                                                                                                                                              |
| ------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | SvelteKit mit TypeScript, Node-Adapter                                 | Server und Client in einem Projekt, kleine Bundles, gutes Verhalten auf alten Handys                                                                    |
| Styling      | Tailwind CSS                                                           | schnelle, konsistente Touch-Größen                                                                                                                      |
| Datenbank    | PostgreSQL 16 mit Drizzle ORM                                          | saubere Typen, JSONB für die Antwortdaten, nebenläufige Schreibzugriffe ohne Sperrprobleme; auf Uberspace als eigene Instanz im Benutzerkonto lauffähig |
| Scheduling   | `ts-fsrs`                                                              | FSRS-Referenzimplementierung in TypeScript                                                                                                              |
| Animation    | CSS-Transitions und Web Animations API, SVG für Material               | keine schwere Animationsbibliothek nötig                                                                                                                |
| Auslieferung | Node-Prozess unter supervisord auf Uberspace, PWA mit Service Worker   | Uberspace bietet kein Docker; Installation als Startbildschirm-Icon, Offline-Puffer für eine Session                                                    |
| Tests        | Vitest für Generatoren und Scheduling, Playwright für einen Touch-Flow | Generatoren und FSRS-Bewertung sind die fehleranfälligen Teile                                                                                          |

**Architektur:** Die Aufgabengeneratoren liegen in `src/lib/skills/` als reine Funktionen `generate(params, seed) → Item` und sind sowohl auf dem Server als auch im Client lauffähig. Der Client holt zu Sessionbeginn eine Liste fälliger Skills mit Parametern und Seeds vom Server, generiert die Items lokal und sendet nach jeder Antwort ein Ergebnisobjekt zurück. Damit läuft die Session auch bei wackligem Mobilfunk flüssig weiter.

**API-Endpunkte (alle JSON, Cookie-Session):**

- `POST /api/login` mit Code, setzt Schüler-Session
- `GET /api/session/next` liefert 8 bis 12 Aufgabenaufträge (Skill, Parameter, Seed)
- `POST /api/attempt` protokolliert eine Antwort (idempotent über `attempt_uuid`)
- `POST /api/session/finish` schließt die Session, rechnet FSRS-Updates
- `GET /api/teacher/...` für Gruppen, Schüler, Codes, Fortschritt

**Wichtig:** FSRS-Zustand wird nur serverseitig geschrieben, niemals aus Clientdaten übernommen. Der Client meldet Fakten (richtig, Dauer, Fehlertyp), der Server entscheidet über Bewertung und nächsten Termin.

## Datenmodell

Sechs Tabellen reichen. Der Skill-Katalog steht im Code, nicht in der Datenbank, damit Generatoren und Definitionen nicht auseinanderlaufen. Die Felder mit der Endung \_json sind JSONB-Spalten, Zeitstempel sind timestamptz, IDs sind uuid mit Vorgabewert.

| Tabelle   | Felder                                                                                                                                               | Hinweise                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `teacher` | id, email, password\_hash, created\_at                                                                                                               | wenige Datensätze, Anlage per CLI-Befehl                                        |
| `group`   | id, teacher\_id, name, active\_track, created\_at                                                                                                    | `active_track` steuert, welche Skills freigeschaltet sind                       |
| `student` | id, group\_id, label, code\_hash, code\_last\_rotated, archived                                                                                      | `label` = Kürzel oder Vorname, frei wählbar; Klartext-Code wird nie gespeichert |
| `card`    | id, student\_id, skill\_id, stability, difficulty, due, last\_review, reps, lapses, state, introduced\_at                                            | eine Zeile pro Schüler und Skill, FSRS-Zustand                                  |
| `attempt` | id, attempt\_uuid, student\_id, skill\_id, session\_id, seed, params\_json, answer\_json, correct, error\_tag, duration\_ms, hint\_used, created\_at | Rohdaten für Fehlerbilder, nie überschrieben                                    |
| `session` | id, student\_id, started\_at, finished\_at, item\_count, correct\_count                                                                              | für Streaks und Nutzungsanzeige                                                 |

**Skill-Katalog im Code:** `{ id, titel, woche, beschreibung, generator, params_default, voraussetzungen: skillId[], eingabe_typ }`. Die `id` ist ein sprechender String wie `buendeln_100` und bleibt stabil, weil FSRS-Karten daran hängen.

**Aufbewahrung:** `attempt` wird nach 12 Monaten automatisch gelöscht, `card` bleibt. Ein archivierter Schüler (Schuljahresende) verliert Code und Label, die Karten bleiben anonymisiert für Statistik oder werden mitgelöscht, je nach Einstellung der Lehrkraft.

## Login per Code

Der Schüler-Login ist ein sechsstelliger Code, eingegeben über einen großen Ziffernblock in der App, nicht über die Systemtastatur.

**Codeformat:** Sechs Ziffern, erzeugt aus einem kryptografisch sicheren Zufall. Ziffern statt Buchstaben, weil sich Groß- und Kleinschreibung sowie O, 0, l und I auf Papier verwechseln lassen. Der Code ist über die gesamte Instanz eindeutig, sodass kein Gruppenname mit eingegeben werden muss.

**Sicherheit:** Gespeichert wird nur ein Hash (Argon2id oder bcrypt). Beim Login wird der eingegebene Code gegen alle aktiven Hashes geprüft; damit das schnell bleibt, wird zusätzlich ein nicht umkehrbarer Kurz-Index (erste 3 Bytes eines HMAC mit Serverschlüssel) als Suchfeld gespeichert. Rate Limit: 10 Versuche pro IP und Minute, danach 60 Sekunden Sperre. Ein Schüler-Cookie ist 180 Tage gültig, `HttpOnly`, `SameSite=Lax`, damit ein Kind seinen Code nicht täglich eintippen muss.

**Codewechsel:** Die Lehrkraft kann für einen Schüler oder eine ganze Gruppe neue Codes erzeugen. Alte Codes werden sofort ungültig, bestehende Sessions abgemeldet. Der Klartext ist genau einmal sichtbar, nämlich beim Erzeugen und im Druck-PDF.

**Erste Anmeldung:** Nach Eingabe des Codes zeigt die App das Label des Schülers groß an und fragt „Bist du das?“ mit zwei großen Feldern. Falsche Karte erwischt, passiert oft, und ohne diese Rückfrage trainieren Kinder auf fremden Konten.

**Lehrer-Zugang:** Getrennte Route `/lehrer` mit E-Mail und Passwort, eigene Session, kein gemeinsamer Cookie-Namensraum mit Schülern. Kein Schüler-Endpunkt akzeptiert eine Lehrer-Session und umgekehrt.

## Skill-Katalog und Aufgabengeneratoren

Zwölf Skills, abgeleitet aus dem sechswöchigen Förderplan. Jeder Skill ist eine FSRS-Karte und hat genau einen Generator und genau einen Eingabetyp. Der Generator liefert `{ prompt, darstellung, loesung, distraktoren, error_tags }`.

| Skill-ID               | Woche | Aufgabe                                             | Eingabetyp                           | Parameter                     |
| ---------------------- | ----- | --------------------------------------------------- | ------------------------------------ | ----------------------------- |
| `buendeln_100`         | 1     | Ungeordnete Menge bündeln, Anzahl bestimmen         | Material antippen, dann Ziffernblock | max\_anzahl, mit\_rest        |
| `tauschen_entbuendeln` | 1     | „Was musst du tauschen?“ vor einer Wegnahme         | Tausch per Wischgeste am Material    | zahl, abzug                   |
| `material_zu_zahl`     | 2     | Gelegtes Material als Zahl schreiben                | Ziffernblock                         | stellen, nullstellen\_erlaubt |
| `zahl_zu_material`     | 2     | Zahl mit Material legen                             | Material aus Vorrat ziehen           | stellen, max\_wert            |
| `zahlwort_ziffern`     | 2     | Gesprochenes oder geschriebenes Zahlwort in Ziffern | Ziffernblock                         | stellen, mit\_nullstellen     |
| `nicht_normiert`       | 2     | „4 H 13 Z 2 E ist welche Zahl?“                     | Ziffernblock                         | ueberschuss\_stelle           |
| `buendel_zaehlen`      | 3     | „Wie viele Zehner stecken in 340?“                  | Ziffernblock                         | zielstelle, zahlenraum        |
| `buendel_umkehr`       | 3     | „34 Zehner sind welche Zahl?“                       | Ziffernblock                         | zielstelle, zahlenraum        |
| `stelle_veraendern`    | 4     | 4 090 + 10, 1 000 − 1                               | Ziffernblock                         | schrittweite, mit\_uebergang  |
| `rechenkette`          | 4     | Kette in gleichen Schritten bis zur Zielzahl        | Ziffernblock je Schritt              | start, schritt, laenge        |
| `zahlenstrahl`         | 5     | Zahl auf leerem Strahl verorten, und umgekehrt      | Schieberegler mit Daumen             | intervall, toleranz\_prozent  |
| `zahlen_vergleichen`   | 5     | Größere Zahl wählen, Stelle begründen               | zwei große Auswahlfelder             | stellen, gleiche\_ziffern     |

Woche 6 (Größen und Dezimalzahlen) wird als Parametererweiterung von `buendel_zaehlen`, `zahlenstrahl` und `zahlen_vergleichen` umgesetzt, nicht als neue Skills. Das Komma ist nur eine weitere Spalte der Stellenwerttafel, und genau diese Gleichheit soll die App transportieren.

**Fehlertypen:** Jeder Generator kennt die typischen Fehlantworten und markiert sie beim Eingang. Beispiele:

| error\_tag             | Bedeutung                                                   | Beispiel                 |
| ---------------------- | ----------------------------------------------------------- | ------------------------ |
| `ziffer_statt_buendel` | Ziffer an der Stelle abgelesen statt Bündel gezählt         | 340 → Antwort 4 statt 34 |
| `kein_umbuendeln`      | Überschuss nicht getauscht                                  | 4 H 13 Z 2 E → 4132      |
| `stellendreher`        | Sprechreihenfolge geschrieben                               | dreiundvierzig → 34      |
| `stelle_isoliert`      | nur eine Stelle geändert, Übertrag ignoriert                | 399 + 1 → 3910           |
| `ziffernvergleich`     | Ziffern statt Stellenwerte verglichen                       | 2,7 < 2,13               |
| `zaehlfehler_eins`     | Ergebnis genau um 1 daneben, Hinweis auf zählendes Vorgehen | 13 − 5 → 9               |

Unbekannte Fehlantworten erhalten `sonstiges` und erscheinen im Dashboard als Rohwert, damit die Lehrkraft neue Muster entdecken kann.

## Touch-Eingabe, Animation und Layout

Fünf Eingabekomponenten decken alle Skills ab. Jede ist einhändig im Hochformat bedienbar, mit allen Bedienelementen in der unteren Hälfte des Bildschirms.

| Komponente      | Bedienung                                                                       | Einsatz                        |
| --------------- | ------------------------------------------------------------------------------- | ------------------------------ |
| `Ziffernblock`  | 0 bis 9, Löschen, Bestätigen; Tasten mindestens 56 px hoch, drei Spalten        | alle Zahleingaben              |
| `MaterialFeld`  | Antippen wählt, Ziehen auf die Tauschfläche bündelt, langes Drücken entbündelt  | Bündeln, Tauschen, Legen       |
| `Stellentafel`  | Material oder Chips per Drag in Spalten ablegen, Spalte antippen erhöht um eins | Darstellungswechsel            |
| `StrahlRegler`  | Daumen schiebt eine Marke, Feinjustierung per Wippe links und rechts            | Zahlenstrahl                   |
| `Auswahlkarten` | zwei bis vier große Felder, ein Tipp genügt                                     | Vergleichen, Begründung wählen |

**Layout-Regeln:** Hochformat ist der einzige gestützte Modus. Die obere Hälfte zeigt Aufgabe und Darstellung, die untere die Eingabe. Mindestgröße für Tippziele 44 px, Abstand 8 px, Schriftgröße der Aufgabenzahl mindestens 32 px. Aufgabentexte höchstens acht Wörter, Zahlen immer zusätzlich als Bild oder Material, nie nur als Text. Kein Doppeltippen, kein Wischen als einzige Möglichkeit, keine Zeitlimits mit sichtbarem Countdown.

**Pflichtanimationen** (je 400 bis 600 ms, abschaltbar in den Einstellungen):

- **Bündeln:** Zehn Einerwürfel rücken zusammen, verschmelzen zu einer Zehnerstange, die kurz aufleuchtet. Dieselbe Animation für Zehner zu Hundert und Hundert zu Tausend, nur skaliert.
- **Entbündeln:** Umkehrung, die Stange zerfällt sichtbar in zehn Würfel.
- **Stellenwechsel:** Beim Übergang 399 + 1 wandern die vollen Stellen nacheinander um, sichtbar von rechts nach links.
- **Material zu Zahl:** Die gelegten Bündel gleiten in die passende Spalte der Stellenwerttafel und werden dort zur Ziffer.

**Rückmeldung:** Richtig gelöst ergibt ein kurzes visuelles Signal ohne Ton, falsch gelöst zeigt keine Fehlermeldung, sondern die Aufgabe noch einmal mit Material und der Möglichkeit, den Tausch selbst durchzuführen. Nach der zweiten falschen Antwort zeigt die App die Lösung als Animation und geht weiter. Kein Kind bleibt an einer Aufgabe hängen.

## FSRS-Scheduling

FSRS terminiert **Fertigkeiten, nicht Items**. Eine Karte ist ein Paar aus Schüler und Skill. Eine Wiederholung besteht aus fünf frisch generierten Aufgaben desselben Skills, und erst aus dem Gesamtergebnis dieser fünf entsteht eine FSRS-Bewertung. Das ist die wichtigste Abweichung von einer klassischen Karteikarten-App und muss so umgesetzt werden, weil einzelne generierte Aufgaben keine wiedererkennbare Identität haben.

**Bewertung einer Wiederholung** (Mapping auf die vier FSRS-Grades):

| Ergebnis der fünf Aufgaben                                  | Grade       | Hinweis                                                               |
| ----------------------------------------------------------- | ----------- | --------------------------------------------------------------------- |
| höchstens 2 richtig                                         | `Again` (1) | Karte fällt zurück, Skill erscheint am nächsten Tag wieder            |
| 3 bis 4 richtig, oder 5 richtig mit Hilfe oder sehr langsam | `Hard` (2)  | Median-Antwortzeit über dem Doppelten des Zielwerts zählt als langsam |
| 5 richtig in normaler Zeit                                  | `Good` (3)  | Standardfall                                                          |
| 5 richtig, Median unter dem Zielwert, ohne Hilfe            | `Easy` (4)  | Zielwert pro Skill im Katalog hinterlegt                              |

**Konfiguration:** `ts-fsrs` mit `request_retention` 0,9 und `maximum_interval` 120 Tage. Längere Intervalle sind im Schuljahr sinnlos, weil die Ferien ohnehin unterbrechen. Optimierung der Parameter aus den eigenen Daten erst ab etwa 1 000 Wiederholungen pro Instanz, vorher Standardgewichte.

**Einführung neuer Skills:** Ein Skill wird nicht direkt von FSRS geplant. Ablauf: Die App zeigt zwei gelöste Beispiele als Animation („Schau zu“), dann drei begleitete Aufgaben mit Material, dann eine erste Prüfrunde aus fünf Aufgaben. Erst wenn diese Runde mindestens `Hard` ergibt, wird eine FSRS-Karte angelegt. Vorher bleibt der Skill im Einführungsmodus und erscheint täglich.

**Freischaltung:** Ein neuer Skill wird freigeschaltet, wenn alle in `voraussetzungen` genannten Skills den Zustand `Review` mit `stability` über 3 Tagen haben und pro Tag höchstens ein neuer Skill dazukommt. Zusätzlich kann die Lehrkraft den `active_track` einer Gruppe auf eine Woche begrenzen, damit die App nicht dem Unterricht vorauseilt.

**Sessionaufbau** (8 bis 12 Aufgaben, 5 bis 8 Minuten):

1. Zwei Aufwärmaufgaben aus einem stabilen, nicht fälligen Skill
2. Alle fälligen Karten, nach `due` aufsteigend, je fünf Aufgaben, höchstens zwei Karten pro Session
3. Falls Platz bleibt: der Einführungsblock eines neuen Skills
4. Abschluss mit einer sicher lösbaren Aufgabe, damit die Session positiv endet

Sind mehr Karten fällig als Platz ist, bleibt der Rest fällig und rückt am Folgetag nach. Es gibt keinen Nachholstapel, der sich sichtbar aufstaut, weil das die Zielgruppe zuverlässig abschreckt.

## Lehrer-Dashboard

Vier Ansichten, mehr nicht. Die Leitfrage der Startseite lautet: Wer braucht diese Woche meine Aufmerksamkeit?

**1. Gruppenübersicht.** Tabelle mit einer Zeile pro Schüler und einer Spalte pro Skill. Jede Zelle ist ein Farbfeld: grau (nicht begonnen), gelb (im Aufbau), grün (stabil, `stability` über 21 Tage), rot (mehrfach `Again` in Folge). Darüber drei Kennzahlen: aktive Schüler der letzten 7 Tage, Median der Sessions pro Kind, Anzahl roter Zellen. Sortierbar nach „meiste rote Zellen zuerst“.

**2. Schülerprofil.** Zeitachse der Sessions, Skill-Liste mit nächstem Fälligkeitsdatum, und die drei häufigsten `error_tag`-Werte im Klartext, etwa „liest die Ziffer statt die Bündel zu zählen, 7 von 12 Fehlern“. Darunter die letzten zehn Fehlversuche mit Aufgabe und gegebener Antwort. Das ist die Ansicht für das Fördergespräch, sie muss auf eine Bildschirmhöhe passen.

**3. Verwaltung.** Gruppe anlegen und umbenennen, Schüler einzeln oder als Liste per Einfügen von Namen anlegen, Schüler zwischen Gruppen verschieben, archivieren, Codes einzeln oder gruppenweise neu erzeugen, `active_track` der Gruppe setzen.

**4. Codes drucken.** Erzeugt ein PDF im A4-Hochformat mit acht Karten pro Seite entlang Schnittlinien. Jede Karte enthält Label des Kindes, den Code in großer Schrift mit Zifferngruppierung (123 456), die kurze URL der Instanz und einen QR-Code, der auf `/login?c=123456` zeigt und den Code direkt einträgt. Erzeugung serverseitig, damit der Klartext nicht im Client-Cache landet.

**Exporte:** CSV je Gruppe mit Schüler, Skill, Zustand, Fälligkeit und Trefferquote, sowie CSV der Fehlertypen. Kein PDF-Zeugnisbericht, das führt zu Notendiskussionen und ist nicht der Zweck.

**Bewusst nicht enthalten:** Live-Überwachung laufender Sessions, Vergleich einzelner Kinder in einer Rangliste, Benachrichtigungen an Eltern.

## Datenschutz und Betrieb

Die App verarbeitet Leistungsdaten Minderjähriger. Das ist beherrschbar, wenn von Anfang an wenig erhoben wird.

- **Datensparsamkeit:** Als Label genügt ein Kürzel wie „L. M.“ oder „Schüler 07“. Die Zuordnung zum echten Namen führt die Lehrkraft auf Papier. Keine Geburtsdaten, keine Klassenlisten, keine E-Mail-Adressen von Kindern.
- **Keine Dritte:** Keine externen Schriftarten, keine CDN, kein Analytics, keine Fehler-Tracker mit Cloudanbindung. Alle Assets liegen lokal.
- **Hosting:** Uberspace, Rechenzentrum in Deutschland. Auftragsverarbeitungsvertrag vor dem Einsatz bei Uberspace anfordern. HTTPS wird automatisch über Let's Encrypt bereitgestellt und per Weiterleitung erzwungen. Zusätzlich zu den Snapshots des Anbieters ein eigenes verschlüsseltes Datenbank-Backup per pg\_dump.
- **Rechte:** Lehrkraft kann einen Schüler samt aller Attempts mit einem Klick löschen und die Daten eines Schülers als JSON exportieren, damit Auskunfts- und Löschersuchen ohne Entwicklerhilfe bedienbar sind.
- **Technisch-organisatorisch:** Zugriff auf das Dashboard nur mit Zwei-Faktor-Option, Sessions der Lehrkraft nach 12 Stunden abgelaufen, Login-Versuche protokolliert.

Vor dem Einsatz ist an einer sächsischen Schule der Schuldatenschutzbeauftragte einzubeziehen und ein Verzeichnis von Verarbeitungstätigkeiten anzulegen. Je nach Einschätzung wird eine Einwilligung der Erziehungsberechtigten benötigt; die Entscheidung darüber trifft die Schule, nicht die App.

**Betrieb:** Deployment per Git-Pull ins Homeverzeichnis, Build mit npm, Node-Version über „uberspace tools version use node“ festlegen. Die App läuft als supervisord-Dienst mit einer Konfigurationsdatei in \~/etc/services.d/, gestartet über supervisorctl reread und supervisorctl update. Erreichbar wird sie mit „uberspace web backend set / --http --port \<port>“, die Domain kommt über „uberspace web domain add“ dazu. Der Node-Server lauscht auf 0.0.0.0 und dem gewählten Port. Migrationen beim Start, ein CLI-Befehl für das Anlegen der ersten Lehrkraft, ein Eintrag im Benutzer-Crontab für das Löschen alter Attempts. Health-Endpunkt unter `/healthz`.

**Was Uberspace für die Architektur bedeutet:** Kein Docker und kein Root, deshalb läuft alles als ein einziger Node-Prozess im Benutzerkontext. PostgreSQL läuft dort nicht als Systemdienst, sondern als eigene Instanz im Benutzerkonto: einmalig mit initdb im Homeverzeichnis angelegt, über einen zweiten supervisord-Dienst gestartet und nur über einen Unix-Socket erreichbar, nicht über TCP. Die Schritte dafür stehen im Uberlab unter guide\_postgresql. Backups laufen als nächtlicher Cronjob mit `pg_dump` in ein eigenes Verzeichnis, zusätzlich zu den Snapshots des Anbieters. Die Node-Version wird von Uberspace gepflegt und kann sich ändern, daher gehört die gewünschte Hauptversion in die Projekt-Dokumentation und nach einem Update ein Neustart des Dienstes dazu. Uberspace ist Shared Hosting mit fairer Nutzung, was für einige hundert Schüler unkritisch ist; Dauerlast durch Hintergrundjobs sollte trotzdem vermieden werden, also FSRS-Berechnung nur bei Sessionende statt zyklisch.

## Meilensteine und Akzeptanzkriterien

Jeder Meilenstein wird einzeln beauftragt und abgenommen. Kein Meilenstein gilt als fertig, solange sein Kriterium nicht auf einem echten Handy geprüft wurde.

| M   | Inhalt                                                                             | Akzeptanzkriterium                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Projektgerüst, Datenmodell, Migrationen, Lehrer-Login, Gruppen und Schüler anlegen | Eine Lehrkraft legt eine Gruppe mit fünf Schülern an; Datenbank enthält fünf Codes als Hash, keinen Klartext                                             |
| 2   | Schüler-Login mit Ziffernblock, Session-Cookie, Rückfrage „Bist du das?“           | Login gelingt auf einem Handy ohne Systemtastatur; falscher Code nach 10 Versuchen gesperrt                                                              |
| 3   | Generatoren und Fehlertypen für die Skills der Wochen 1 bis 3, mit Unit-Tests      | 200 generierte Items pro Skill sind alle lösbar, eindeutig und innerhalb der Parametergrenzen; bekannte Fehlantworten erhalten den richtigen `error_tag` |
| 4   | Eingabekomponenten und Animationen, ein vollständiger Session-Flow ohne Scheduling | Eine Session mit 10 Aufgaben ist einhändig im Hochformat lösbar; Bündel-Animation läuft auf einem vier Jahre alten Android flüssig                       |
| 5   | FSRS-Integration, Einführungsmodus, Freischaltlogik, Sessionaufbau                 | Simulierter Schüler über 30 Tage erzeugt plausible Intervalle; ein `Again` setzt die Karte auf den Folgetag; nie mehr als ein neuer Skill pro Tag        |
| 6   | Dashboard: Übersicht, Schülerprofil, Fehlerbilder, CSV-Export                      | Farbmatrix zeigt für Testdaten korrekte Zustände; Schülerprofil passt ohne Scrollen auf einen Laptopbildschirm                                           |
| 7   | Code-PDF mit QR, Codewechsel, Archivierung, Löschfunktion                          | PDF mit 8 Karten pro Seite druckbar; QR-Login funktioniert; gelöschter Schüler hinterlässt keine Attempts                                                |
| 8   | Generatoren Wochen 4 bis 6, PWA, Offline-Puffer, Deployment                        | Session läuft bei abgeschaltetem Netz zu Ende und synchronisiert danach; App ist als Icon installierbar                                                  |

**Arbeitsweise für das umsetzende Modell:** Beginne mit Meilenstein 3, sobald das Gerüst steht. Die Generatoren sind der inhaltliche Kern und sollen vor der Oberfläche stehen, weil sich aus ihrer Struktur ergibt, welche Eingabekomponenten nötig sind. Schreibe zu jedem Generator zuerst die Tests mit den Beispielen aus der Fehlertypen-Tabelle, dann die Implementierung.

**Offene Entscheidungen, die vor Meilenstein 4 zu klären sind:** Soll das Material als SVG-Grafik oder als CSS-Raster gezeichnet werden (SVG ist flexibler, CSS schneller auf schwachen Geräten)? Sollen Kinder eine Session freiwillig verlängern können, oder endet sie hart nach zwölf Aufgaben?
