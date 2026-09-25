import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { pgOptions } from '../src/lib/server/db/connection.js';
import { TEST_DATABASE_URL } from '../playwright.config';
import { SCHUELER } from './testdaten';
import { tippeCode } from './hilfen';

test.describe.configure({ mode: 'serial' });

test('ohne Anmeldung landet man beim Ziffernblock, ohne Eingabefeld', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL('/login');
	await expect(page.getByText('Dein Code')).toBeVisible();
	// keine Systemtastatur: es gibt kein einziges Eingabefeld
	await expect(page.locator('input, textarea, [contenteditable]')).toHaveCount(0);
	// Tasten mindestens 56 px hoch und in der unteren Bildschirmhälfte
	const viewport = page.viewportSize()!;
	for (const taste of await page
		.getByRole('group', { name: 'Ziffernblock' })
		.getByRole('button')
		.all()) {
		const box = (await taste.boundingBox())!;
		expect(box.height).toBeGreaterThanOrEqual(56);
		expect(box.y).toBeGreaterThanOrEqual(viewport.height / 2);
	}
});

test('Anmeldung per Antippen mit Rückfrage „Bist du das?“', async ({ page, context }) => {
	await page.goto('/login');
	await tippeCode(page, SCHUELER.code);
	await expect(page.getByText('Bist du das?')).toBeVisible();
	await expect(page.getByTestId('label')).toHaveText(SCHUELER.label);
	// vor dem Ja gibt es noch kein Cookie
	expect((await context.cookies()).find((c) => c.name === 'swt_schueler')).toBeUndefined();

	await page.getByRole('button', { name: 'Ja' }).tap();
	await expect(page).toHaveURL('/');
	await expect(page.getByTestId('begruessung')).toHaveText(SCHUELER.label);

	const cookie = (await context.cookies()).find((c) => c.name === 'swt_schueler')!;
	expect(cookie.httpOnly).toBe(true);
	expect(cookie.sameSite).toBe('Lax');
	const tage = (cookie.expires - Date.now() / 1000) / 86400;
	expect(tage).toBeGreaterThan(179);
	expect(tage).toBeLessThanOrEqual(180);

	// am nächsten Tag: kein Code nötig
	const neu = await context.newPage();
	await neu.goto('/');
	await expect(neu.getByTestId('begruessung')).toHaveText(SCHUELER.label);

	// Schüler-Cookie öffnet den Lehrerbereich nicht
	await neu.goto('/lehrer/gruppen');
	await expect(neu).toHaveURL('/lehrer');
});

test('„Nein“ führt zurück zum leeren Ziffernblock', async ({ page, context }) => {
	await page.goto('/login');
	await tippeCode(page, SCHUELER.code);
	await page.getByRole('button', { name: 'Nein' }).tap();
	await expect(page.getByText('Dein Code')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Bestätigen' })).toBeDisabled();
	expect((await context.cookies()).find((c) => c.name === 'swt_schueler')).toBeUndefined();
});

test('QR-Link trägt den Code ein und fragt sofort nach', async ({ page }) => {
	await page.goto(`/login?c=${SCHUELER.code}`);
	await expect(page.getByTestId('label')).toHaveText(SCHUELER.label);
	await expect(page).toHaveURL('/login');
});

test('Codewechsel meldet bestehende Sessions ab', async ({ page }) => {
	await page.goto('/login');
	await tippeCode(page, SCHUELER.code);
	await page.getByRole('button', { name: 'Ja' }).tap();
	await expect(page).toHaveURL('/');

	const sql = postgres({ ...pgOptions(TEST_DATABASE_URL), onnotice: () => {} });
	await sql`update student set code_last_rotated = now() + interval '1 second'`;
	await page.waitForTimeout(1100);
	await page.reload();
	await expect(page).toHaveURL('/login');
	await sql`update student set code_last_rotated = now() - interval '1 minute'`;
	await sql.end();
});
