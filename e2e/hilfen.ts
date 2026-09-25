import { expect, type Locator, type Page } from '@playwright/test';
import postgres from 'postgres';
import { pgOptions } from '../src/lib/server/db/connection.js';
import { TEST_DATABASE_URL } from '../playwright.config';
import { SCHUELER } from './testdaten';

/** Code nur per Antippen des Ziffernblocks eingeben, wie ein Kind am Handy */
export async function tippeCode(page: Page, code: string) {
	const block = page.getByRole('group', { name: 'Ziffernblock' });
	for (const z of code) await block.getByRole('button', { name: z, exact: true }).tap();
	await block.getByRole('button', { name: 'Bestätigen' }).tap();
}

/** Anmelden ohne UI (die UI testet login.e2e.ts); setzt das Schüler-Cookie im Kontext */
export async function anmelden(page: Page) {
	const res = await page.request.post('/api/login', {
		data: { code: SCHUELER.code, bestaetigt: true }
	});
	expect(res.ok()).toBe(true);
}

/** Einhändig: jedes Bedienelement, das ein Kind antippen muss, liegt in der unteren Bildschirmhälfte */
export async function tippeUnten(page: Page, ziel: Locator) {
	await ziel.waitFor();
	await expect(ziel).toBeEnabled();
	const box = (await ziel.boundingBox())!;
	expect(box.y, `${ziel} liegt in der unteren Hälfte`).toBeGreaterThanOrEqual(
		page.viewportSize()!.height / 2
	);
	await ziel.tap();
}

export function datenbank() {
	return postgres({ ...pgOptions(TEST_DATABASE_URL), onnotice: () => {} });
}
