import { expect, type Page } from '@playwright/test';
import { SKILLS } from '../src/lib/skills/katalog';
import { STELLEN, STELLENNAME, normiert } from '../src/lib/skills/material';
import { STELLEN_NAME } from '../src/lib/skills/stellen';
import { zahlText } from '../src/lib/skills/text';
import type { Auftrag, SessionAntwort } from '../src/lib/training';
import { tippeUnten } from './hilfen';

/** Löst eine Aufgabe richtig, ausschließlich über Bedienelemente der unteren Bildschirmhälfte. */
export async function loese(page: Page, auftrag: Auftrag) {
	const tippeZahl = async (n: number) => {
		for (const z of String(n)) await unten(z === '.' ? 'Komma' : z);
		await unten('Bestätigen');
	};
	const skill = SKILLS.get(auftrag.skill_id)!;
	const item = skill.generator!.generate(auftrag.params, auftrag.seed);
	await expect(page.getByTestId('prompt')).toHaveText(item.prompt);
	const unten = (name: string, exact = true) =>
		tippeUnten(page, page.getByRole('button', { name, exact }));

	if (auftrag.block === 'beispiel') {
		// „Schau zu“: die Lösung läuft als Animation, danach nur Weiter
		await expect(page.getByTestId('schau-zu')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Weiter' })).toBeEnabled({ timeout: 15_000 });
		await unten('Weiter');
		return;
	}

	if (
		skill.eingabe_typ === 'material_tauschen' &&
		item.darstellung.typ === 'wegnahme' &&
		item.loesung.typ === 'material'
	) {
		// von oben nach unten so oft tauschen, bis die Lösung liegt
		const ziel = item.loesung.material;
		let zufluss = 0;
		for (const s of STELLEN) {
			const vorhanden = (item.darstellung.material[s] ?? 0) + zufluss;
			const tausche = vorhanden - (ziel[s] ?? 0);
			for (let i = 0; i < tausche; i++) await unten(`1 ${STELLENNAME[s].einzahl} tauschen`);
			zufluss = 10 * Math.max(0, tausche);
		}
		await unten('Fertig');
	} else if (skill.eingabe_typ === 'material_legen' && item.darstellung.typ === 'zahl') {
		const m = normiert(item.darstellung.zahl);
		for (const s of STELLEN)
			for (let i = 0; i < (m[s] ?? 0); i++) await unten(`${STELLENNAME[s].einzahl} nehmen`);
		await unten('Fertig');
	} else if (item.loesung.typ === 'kette') {
		for (const w of item.loesung.werte) await tippeZahl(w);
	} else if (item.loesung.typ === 'vergleich' && item.darstellung.typ === 'vergleich') {
		await unten(zahlText(item.darstellung.zahlen[item.loesung.groessere]));
		await unten(`${item.loesung.stelle} ${STELLEN_NAME[item.loesung.stelle]}`);
	} else if (item.darstellung.typ === 'strahl' && item.darstellung.modus === 'verorten') {
		// auf den Strahl tippen, dort wo die Zahl liegt (Linie von x = 40 bis 960 im viewBox 0…1000)
		const { von, bis, zahl } = item.darstellung;
		const strahl = page.locator('.unten [data-testid="strahl"]');
		const box = (await strahl.boundingBox())!;
		expect(box.y).toBeGreaterThanOrEqual(page.viewportSize()!.height / 2);
		const x = box.x + (box.width * (40 + ((zahl - von) / (bis - von)) * 920)) / 1000;
		await page.touchscreen.tap(x, box.y + box.height / 2);
		await expect(page.getByTestId('marke')).toBeVisible();
		await unten('Fertig');
	} else if (item.loesung.typ === 'zahl') {
		await tippeZahl(item.loesung.wert);
	}
	await expect(page.getByTestId('richtig')).toBeVisible();
	await expect(page.getByTestId('richtig')).toBeHidden();
}

export async function sessionAntwort(
	page: Page,
	aktion: () => Promise<unknown>
): Promise<SessionAntwort> {
	const [res] = await Promise.all([
		page.waitForResponse((r) => r.url().includes('/api/session/next')),
		aktion()
	]);
	return res.json();
}
