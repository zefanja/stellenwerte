import { expect, test } from '@playwright/test';
import { STELLEN, STELLENNAME } from '../src/lib/skills/material';
import { SKILLS } from '../src/lib/skills/katalog';
import { datenbank, tippeUnten } from './hilfen';
import { loese, sessionAntwort } from './loesen';
import { SCHUELER_LEGEN } from './testdaten';

test('mehrfaches Tippen auf „Fertig“: eine Antwort, keine leere Abgabe, keine Aufgabe übersprungen', async ({
	page
}) => {
	const res = await page.request.post('/api/login', {
		data: { code: SCHUELER_LEGEN.code, bestaetigt: true }
	});
	expect(res.ok()).toBe(true);
	const s = await sessionAntwort(page, () => page.goto('/ueben'));
	const erste = s.auftraege.findIndex((a) => a.skill_id === 'zahl_zu_material');
	expect(s.auftraege.slice(erste, erste + 5).map((a) => a.block)).toEqual(
		Array(5).fill('wiederholung')
	);
	for (const a of s.auftraege.slice(0, erste)) await loese(page, a);

	// leere Tafel lässt sich nicht abgeben
	await expect(page.getByTestId('prompt')).toHaveText('Lege die Zahl mit Material.');
	const fertig = page.getByRole('button', { name: 'Fertig' });
	await expect(fertig).toBeDisabled();

	const auftrag = s.auftraege[erste];
	const item = SKILLS.get(auftrag.skill_id)!.generator!.generate(auftrag.params, auftrag.seed);
	const m = item.loesung.typ === 'material' ? item.loesung.material : {};
	for (const st of STELLEN)
		for (let i = 0; i < (m[st] ?? 0); i++)
			await tippeUnten(
				page,
				page.getByRole('button', { name: `${STELLENNAME[st].einzahl} nehmen` })
			);
	await expect(page.locator('.teil')).toHaveCount(STELLEN.reduce((n, st) => n + (m[st] ?? 0), 0));
	await expect(fertig).toBeEnabled();

	// ungeduldig: viermal auf dieselbe Stelle, über den Wechsel zur nächsten Aufgabe hinweg
	const box = (await fertig.boundingBox())!;
	for (const pause of [0, 250, 600, 400]) {
		await page.waitForTimeout(pause);
		await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
	}
	// die nächste Aufgabe ist dran, nicht die übernächste
	const punkte = page.locator('ol[aria-label="Fortschritt"] li');
	await expect(punkte.nth(erste + 1)).toHaveClass(/bg-slate-800/);
	await expect(page.locator('.teil')).toHaveCount(0);

	for (const a of s.auftraege.slice(erste + 1)) await loese(page, a);
	await tippeUnten(page, page.getByRole('button', { name: 'Fertig' }));
	await expect(page).toHaveURL('/');

	const sql = datenbank();
	const versuche =
		await sql`select seed, correct from attempt where session_id = ${s.session_id} and skill_id = 'zahl_zu_material' and block = 'wiederholung'`;
	const [karte] = await sql`select reps from card join student on student.id = card.student_id
		where card.skill_id = 'zahl_zu_material' and student.label = ${SCHUELER_LEGEN.label}`;
	await sql.end();
	// je Aufgabe genau ein Versuch, alle richtig: die Runde ist vollständig und wird bewertet
	expect(versuche).toHaveLength(5);
	expect(new Set(versuche.map((v) => v.seed)).size).toBe(5);
	expect(versuche.every((v) => v.correct)).toBe(true);
	expect(karte.reps).toBe(4);
});
