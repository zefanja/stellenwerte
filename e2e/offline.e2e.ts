import { expect, test } from '@playwright/test';
import { datenbank, tippeUnten } from './hilfen';
import { loese } from './loesen';
import { SCHUELER_OFFLINE } from './testdaten';
import type { SessionAntwort } from '../src/lib/training';

test.describe.configure({ mode: 'serial' });

test('PWA: Manifest mit Icons, Service Worker aktiv', async ({ page }) => {
	await page.goto('/login');
	const manifest = await (await page.request.get('/manifest.webmanifest')).json();
	expect(manifest).toMatchObject({
		name: 'Stellenwerttraining',
		display: 'standalone',
		start_url: '/',
		orientation: 'portrait'
	});
	for (const groesse of ['192x192', '512x512'])
		expect(manifest.icons.some((i: { sizes: string }) => i.sizes === groesse)).toBe(true);
	for (const icon of manifest.icons) {
		const res = await page.request.get(icon.src);
		expect(res.headers()['content-type']).toBe('image/png');
	}
	await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
		'href',
		/manifest\.webmanifest$/
	);
	expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state)).toBe(
		'activated'
	);
});

test('Session läuft ohne Netz zu Ende und synchronisiert danach', async ({ page, context }) => {
	expect(
		(
			await page.request.post('/api/login', {
				data: { code: SCHUELER_OFFLINE.code, bestaetigt: true }
			})
		).ok()
	).toBe(true);
	// Service Worker installieren und die Seiten einmal online laden, damit sie im Cache liegen
	await page.goto('/');
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
	});
	await page.reload();
	expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

	const [antwort] = await Promise.all([
		page.waitForResponse((r) => r.url().includes('/api/session/next')),
		page.goto('/ueben')
	]);
	const session = (await antwort.json()) as SessionAntwort;
	const auftraege = session.auftraege;
	const beantwortbar = auftraege.filter((a) => a.block !== 'beispiel').length;

	// die ersten vier Aufgaben (zwei Beispiele, zwei begleitete) online
	for (const a of auftraege.slice(0, 4)) await loese(page, a);
	const sql = datenbank();
	await expect
		.poll(
			async () =>
				(
					await sql`select count(*)::int as n from attempt where session_id = ${session.session_id}`
				)[0].n
		)
		.toBe(2);

	// Netz weg; zwischendurch lädt das Kind sogar die Seite neu
	await context.setOffline(true);
	await loese(page, auftraege[4]);
	await page.reload();
	for (const a of auftraege.slice(5)) await loese(page, a);
	await expect(page.getByText('Geschafft!')).toBeVisible();
	await tippeUnten(page, page.getByRole('button', { name: 'Fertig' }));
	await expect(page.getByTestId('offline-gespeichert')).toBeVisible();
	expect(
		(await sql`select count(*)::int as n from attempt where session_id = ${session.session_id}`)[0]
			.n
	).toBe(2);

	// Netz zurück: alles kommt an, die Session wird abgeschlossen und bewertet
	await context.setOffline(false);
	await expect
		.poll(
			async () =>
				(
					await sql`select count(*)::int as n from attempt where session_id = ${session.session_id}`
				)[0].n,
			{ timeout: 15_000 }
		)
		.toBe(beantwortbar);
	await expect
		.poll(
			async () =>
				(
					await sql`select finished_at is not null as fertig from session where id = ${session.session_id}`
				)[0].fertig,
			{ timeout: 15_000 }
		)
		.toBe(true);
	const [karte] =
		await sql`select card.state from card join student on student.id = card.student_id where student.label = ${SCHUELER_OFFLINE.label}`;
	await sql.end();
	expect(karte.state).toBe(2);
});
