import { expect, test, type Page } from '@playwright/test';
import { DASHBOARD, LEHRKRAFT } from './testdaten';

// Lehrkraft am Laptop: 1366×768 abzüglich Browserleisten
test.use({ viewport: { width: 1366, height: 660 }, isMobile: false, hasTouch: false });
test.describe.configure({ mode: 'serial' });

async function lehrerLogin(page: Page) {
	await page.goto('/lehrer');
	await page.getByLabel('E-Mail').fill(LEHRKRAFT.email);
	await page.getByLabel('Passwort').fill(LEHRKRAFT.password);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page).toHaveURL('/lehrer/gruppen');
}

async function oeffneGruppe(page: Page) {
	await page.getByRole('link', { name: DASHBOARD.gruppe }).click();
	await expect(page.getByTestId('matrix')).toBeVisible();
}

test('Farbmatrix zeigt für die Testdaten die richtigen Zustände', async ({ page }) => {
	await lehrerLogin(page);
	await oeffneGruppe(page);
	const skills = await page
		.locator('tbody tr')
		.first()
		.locator('td[data-skill]')
		.evaluateAll((tds) => tds.map((td) => td.getAttribute('data-skill')!));
	expect(skills.length).toBeGreaterThanOrEqual(8);
	for (const [label, erwartet] of Object.entries(DASHBOARD.erwartet)) {
		const zeile = page.locator(`tr[data-schueler="${label}"]`);
		for (const skill of skills) {
			await expect(
				zeile.locator(`td[data-skill="${skill}"] [data-status]`),
				`${label} / ${skill}`
			).toHaveAttribute('data-status', erwartet[skill] ?? 'grau');
		}
	}
	// Kennzahlen: nur Anna war in den letzten 7 Tagen aktiv, Median der Sessions 0, drei rote Felder
	await expect(page.getByTestId('aktiv7')).toHaveText('1 von 4');
	await expect(page.getByTestId('median')).toHaveText('0');
	await expect(page.getByTestId('rot')).toHaveText('3');
});

test('sortiert nach meisten roten Feldern', async ({ page }) => {
	await lehrerLogin(page);
	await oeffneGruppe(page);
	await page.getByRole('link', { name: 'meiste rote Felder zuerst' }).click();
	await expect(page.locator('tbody tr').first()).toHaveAttribute('data-schueler', 'Dana');
	const reihenfolge = await page
		.locator('tbody tr')
		.evaluateAll((trs) => trs.map((tr) => tr.getAttribute('data-schueler')));
	expect(reihenfolge).toEqual(['Dana', 'Anna', 'Ben', 'Cem']);
});

test('Schülerprofil passt ohne Scrollen auf einen Laptopbildschirm', async ({ page }) => {
	await lehrerLogin(page);
	await oeffneGruppe(page);
	await page.getByRole('link', { name: 'Anna', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Anna' })).toBeVisible();

	await expect(page.getByTestId('haeufigste-fehler')).toContainText(
		'liest die Ziffer an der Stelle ab, statt die Bündel zu zählen, 3 von 4 Fehlern'
	);
	// zehn Zeilen: der schlimmste Fall für die Höhe
	await expect(page.getByTestId('letzte-fehler').locator('tbody tr')).toHaveCount(10);
	await expect(page.getByTestId('zeitachse').locator('[data-geuebt="true"]')).toHaveCount(2);

	for (const viewport of [
		{ width: 1366, height: 660 },
		{ width: 1280, height: 620 }
	]) {
		await page.setViewportSize(viewport);
		const { scroll, hoehe, breite, scrollB } = await page.evaluate(() => ({
			scroll: document.documentElement.scrollHeight,
			hoehe: window.innerHeight,
			scrollB: document.documentElement.scrollWidth,
			breite: window.innerWidth
		}));
		expect(scroll, `Höhe bei ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(hoehe);
		expect(scrollB).toBeLessThanOrEqual(breite);
	}
});

test('CSV-Exporte für Excel, nur für die eigene Lehrkraft', async ({ page, request }) => {
	await lehrerLogin(page);
	await oeffneGruppe(page);
	const href = await page.getByRole('link', { name: 'CSV: Stand' }).getAttribute('href');
	const stand = await (await page.request.get(href!)).text();
	expect(stand.startsWith('﻿Schüler;Skill;Zustand;')).toBe(true);
	expect(stand).toContain('Anna;Bündeln bis 100;stabil;30;');
	expect(stand).toContain('Ben;Bündeln bis 100;in Einführung;');
	expect(stand).toContain('Dana;Material als Zahl;braucht Hilfe;');

	const fehler = await (await page.request.get(href!.replace('stand.csv', 'fehler.csv'))).text();
	expect(fehler).toContain(
		'Anna;Bündel zählen;ziffer_statt_buendel;liest die Ziffer an der Stelle ab, statt die Bündel zu zählen;3'
	);

	// ohne Lehrer-Cookie kein Zugriff
	expect((await request.get(href!)).status()).toBe(401);
});
