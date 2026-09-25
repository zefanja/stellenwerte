import { expect, test } from '@playwright/test';
import { SCHUELER } from './testdaten';
import { tippeCode } from './hilfen';

// Eigene Datei, die alphabetisch zuletzt läuft: Danach ist die Test-IP 60 Sekunden gesperrt.
test('nach 10 falschen Codes ist die Anmeldung gesperrt, auch mit richtigem Code', async ({
	page
}) => {
	await page.goto('/login');
	for (let i = 0; i < 9; i++) {
		await tippeCode(page, '000000');
		await expect(page.getByText('Code falsch. Probier es noch mal.')).toBeVisible();
	}
	await tippeCode(page, '000000');
	await expect(page.getByText('Kurz warten. Dann noch mal.')).toBeVisible();
	await expect(page.getByRole('button', { name: '1', exact: true })).toBeDisabled();

	const res = await page.request.post('/api/login', { data: { code: SCHUELER.code } });
	expect(res.status()).toBe(429);
});
