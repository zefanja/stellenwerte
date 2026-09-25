import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { devices, expect, test, type Page } from '@playwright/test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { datenbank, lehrerLogin } from './hilfen';

// Lehrkraft am Laptop; Codekarten werden mit Poppler (pdftotext, pdftoppm) geprüft
test.use({ viewport: { width: 1366, height: 800 }, isMobile: false, hasTouch: false });
test.describe.configure({ mode: 'serial' });

const BASIS = 'http://localhost:4173';
const LABELS = Array.from({ length: 9 }, (_, i) => `Druck ${String(i + 1).padStart(2, '0')}`);
/** Klartext-Codes aus dem ersten Test, für die folgenden */
const codes = new Map<string, string>();

/** Kein Treffer fürs Rate Limit der übrigen Tests: Fehlversuche kommen von einer anderen IP */
const ANDERE_IP = { 'x-forwarded-for': '198.51.100.7' };

async function schuelerLogin(page: Page, code: string) {
	return page.request.post('/api/login', { data: { code, bestaetigt: true }, headers: ANDERE_IP });
}

async function oeffneVerwaltung(page: Page) {
	await lehrerLogin(page);
	await page.getByRole('link', { name: 'Druckgruppe' }).click();
	await page.getByRole('link', { name: 'Verwaltung' }).click();
}

async function aktion(page: Page, label: string, knopf: string, radio?: string) {
	const zeile = page.locator(`li[data-schueler="${label}"]`);
	await zeile.locator('summary').click();
	if (radio) await zeile.getByLabel(radio).check();
	page.once('dialog', (d) => d.accept());
	await zeile.getByRole('button', { name: knopf }).click();
}

async function zaehle(studentId: string) {
	const sql = datenbank();
	const [r] = await sql`select
		(select count(*) from student where id = ${studentId})::int as schueler,
		(select count(*) from attempt where student_id = ${studentId})::int as versuche,
		(select count(*) from card where student_id = ${studentId})::int as karten,
		(select count(*) from session where student_id = ${studentId})::int as sessions`;
	await sql.end();
	return r;
}

/** Schüler meldet sich an und löst eine Aufgabe, damit Versuche, Karte und Session existieren */
async function uebeEtwas(page: Page, code: string) {
	const ctx = await page
		.context()
		.browser()!
		.newContext({ baseURL: BASIS, extraHTTPHeaders: { 'x-forwarded-for': '198.51.100.8' } });
	const req = ctx.request;
	expect((await req.post('/api/login', { data: { code, bestaetigt: true } })).ok()).toBe(true);
	const s = await (await req.get('/api/session/next')).json();
	const res = await req.post('/api/attempt', {
		data: {
			attempt_uuid: crypto.randomUUID(),
			session_id: s.session_id,
			auftrag: s.auftraege[2],
			answer: { typ: 'zahl', wert: 1 },
			duration_ms: 5000,
			hint_used: false
		}
	});
	expect(res.ok()).toBe(true);
	await ctx.close();
}

async function idVon(label: string): Promise<string> {
	const sql = datenbank();
	const [r] = await sql`select id from student where label = ${label}`;
	await sql.end();
	return r.id;
}

test('Codekarten-PDF: acht Karten pro A4-Seite, Codes lesbar, QR-Code führt zum Login', async ({
	page,
	browser
}, info) => {
	await lehrerLogin(page);
	await page.getByLabel('Neue Gruppe').fill('Druckgruppe');
	await page.getByRole('button', { name: 'Anlegen' }).click();
	await expect(page).toHaveURL(/\/verwaltung$/);
	await page.getByLabel(/Schüler hinzufügen/).fill(LABELS.join('\n'));
	await page.getByRole('button', { name: 'Anlegen und Codes erzeugen' }).click();

	const zeilen = page.getByTestId('neue-codes').locator('tr');
	await expect(zeilen).toHaveCount(9);
	for (const z of await zeilen.all()) {
		const [label, code] = await z.locator('td').allInnerTexts();
		codes.set(label, code.replace(/\s/g, ''));
	}
	expect([...codes.keys()].sort()).toEqual(LABELS);

	const pdf = await page.request.get((await page.getByTestId('pdf-link').getAttribute('href'))!);
	expect(pdf.headers()['content-type']).toBe('application/pdf');
	expect(pdf.headers()['cache-control']).toContain('no-store');
	const datei = info.outputPath('codekarten.pdf');
	writeFileSync(datei, await pdf.body());

	// Text: zwei Seiten, 8 + 1 Karten, jeder Code gruppiert (123 456)
	const seiten = execFileSync('pdftotext', ['-layout', datei, '-'])
		.toString()
		.split('\f')
		.filter((s) => s.trim());
	expect(seiten).toHaveLength(2);
	expect(LABELS.filter((l) => seiten[0].includes(l))).toHaveLength(8);
	expect(LABELS.filter((l) => seiten[1].includes(l))).toHaveLength(1);
	for (const code of codes.values())
		expect(seiten.join('')).toContain(`${code.slice(0, 3)} ${code.slice(3)}`);

	// QR-Codes von Seite 1 aus dem gerenderten Bild lesen, Karte für Karte
	execFileSync('pdftoppm', [
		'-r',
		'150',
		'-png',
		'-f',
		'1',
		'-l',
		'1',
		'-singlefile',
		datei,
		info.outputPath('seite1')
	]);
	const bild = PNG.sync.read(readFileSync(info.outputPath('seite1.png')));
	const urls: string[] = [];
	for (let zeile = 0; zeile < 4; zeile++) {
		for (let spalte = 0; spalte < 2; spalte++) {
			const b = Math.floor(bild.width / 2);
			const h = Math.floor(bild.height / 4);
			const ausschnitt = new Uint8ClampedArray(b * h * 4);
			for (let y = 0; y < h; y++) {
				const quelle = ((zeile * h + y) * bild.width + spalte * b) * 4;
				ausschnitt.set(bild.data.subarray(quelle, quelle + b * 4), y * b * 4);
			}
			urls.push(jsQR(ausschnitt, b, h)?.data ?? 'nicht lesbar');
		}
	}
	const erwartet = [...codes.values()].map((c) => `${BASIS}/login?c=${c}`);
	expect(
		urls.every((u) => erwartet.includes(u)),
		urls.join('\n')
	).toBe(true);
	expect(new Set(urls).size).toBe(8);

	// QR-Login am Handy: Adresse aus dem QR-Code öffnen, „Bist du das?“, Ja
	const handy = await browser.newContext({
		...devices['Pixel 7'],
		baseURL: BASIS,
		extraHTTPHeaders: { 'x-forwarded-for': '198.51.100.9' }
	});
	const kind = await handy.newPage();
	await kind.goto(urls[0]);
	const label = [...codes].find(([, c]) => urls[0].endsWith(c))![0];
	await expect(kind.getByTestId('label')).toHaveText(label);
	await kind.getByRole('button', { name: 'Ja' }).tap();
	await expect(kind.getByTestId('begruessung')).toHaveText(label);
	await handy.close();
});

test('neuer Code: der alte gilt sofort nicht mehr', async ({ page }) => {
	await oeffneVerwaltung(page);
	const label = LABELS[0];
	const alt = codes.get(label)!;
	await aktion(page, label, 'Neuer Code');
	const neu = (await page.getByTestId('code').innerText()).replace(/\s/g, '');
	expect(neu).not.toBe(alt);
	expect((await schuelerLogin(page, alt)).status()).toBe(401);
	expect((await schuelerLogin(page, neu)).status()).toBe(200);
});

test('Löschen: ein gelöschter Schüler hinterlässt keine Versuche, Karten oder Sessions', async ({
	page
}) => {
	const label = LABELS[1];
	const id = await idVon(label);
	await uebeEtwas(page, codes.get(label)!);
	const vorher = await zaehle(id);
	expect(vorher.versuche).toBeGreaterThan(0);
	expect(vorher.karten).toBeGreaterThan(0);

	await oeffneVerwaltung(page);
	await aktion(page, label, 'Löschen');
	await expect(page.getByRole('status')).toContainText('gelöscht');
	expect(await zaehle(id)).toEqual({ schueler: 0, versuche: 0, karten: 0, sessions: 0 });
});

test('Archivieren: Code und Kürzel weg, Lernstand bleibt anonym erhalten', async ({ page }) => {
	const label = LABELS[2];
	const id = await idVon(label);
	await uebeEtwas(page, codes.get(label)!);

	await oeffneVerwaltung(page);
	await aktion(page, label, 'Archivieren', 'Lernstand anonym behalten');
	await expect(page.getByRole('status')).toContainText('archiviert');
	await expect(page.locator(`li[data-schueler="${label}"]`)).toHaveCount(0);

	const sql = datenbank();
	const [s] = await sql`select label, archived, code_hash from student where id = ${id}`;
	await sql.end();
	expect(s).toEqual({ label: 'archiviert', archived: true, code_hash: null });
	expect((await zaehle(id)).versuche).toBeGreaterThan(0);
	expect((await schuelerLogin(page, codes.get(label)!)).status()).toBe(401);
});

test('Datenauskunft als JSON', async ({ page }) => {
	const label = LABELS[3];
	await uebeEtwas(page, codes.get(label)!);
	await oeffneVerwaltung(page);
	const zeile = page.locator(`li[data-schueler="${label}"]`);
	await zeile.locator('summary').click();
	const href = await zeile.getByRole('link', { name: 'Daten (JSON)' }).getAttribute('href');
	const daten = await (await page.request.get(href!)).json();
	expect(daten.schueler.label).toBe(label);
	expect(daten.versuche.length).toBeGreaterThan(0);
	expect(JSON.stringify(daten)).not.toContain('code_hash');
	expect(JSON.stringify(daten)).not.toContain(codes.get(label)!);
});
