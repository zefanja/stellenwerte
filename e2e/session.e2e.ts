import { expect, test, type Page } from '@playwright/test';
import { SKILLS } from '../src/lib/skills/katalog';
import { STELLEN, STELLENNAME, normiert } from '../src/lib/skills/material';
import type { Auftrag, SessionAntwort } from '../src/lib/training';
import { anmelden, datenbank, tippeUnten } from './hilfen';
import { SCHUELER } from './testdaten';

test.describe.configure({ mode: 'serial' });

/** Löst eine Aufgabe richtig, ausschließlich über Bedienelemente der unteren Bildschirmhälfte. */
async function loese(page: Page, auftrag: Auftrag) {
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
	} else if (item.loesung.typ === 'zahl') {
		for (const z of String(item.loesung.wert)) await unten(z);
		await unten('Bestätigen');
	}
	await expect(page.getByTestId('richtig')).toBeVisible();
	await expect(page.getByTestId('richtig')).toBeHidden();
}

async function sessionAntwort(page: Page, aktion: () => Promise<unknown>): Promise<SessionAntwort> {
	const [res] = await Promise.all([
		page.waitForResponse((r) => r.url().includes('/api/session/next')),
		aktion()
	]);
	return res.json();
}

test('erste Session: Einführung einhändig lösbar, Verlängerung, danach FSRS-Karte', async ({
	page
}) => {
	await anmelden(page);
	await page.goto('/');
	const erste = await sessionAntwort(page, () =>
		tippeUnten(page, page.getByRole('link', { name: "Los geht's" }))
	);
	// neuer Schüler: zwei Beispiele, drei begleitete Aufgaben, Prüfrunde aus fünf
	expect(erste.auftraege.map((a) => a.block)).toEqual([
		...Array(2).fill('beispiel'),
		...Array(3).fill('gefuehrt'),
		...Array(5).fill('pruefung')
	]);
	expect(new Set(erste.auftraege.map((a) => a.skill_id))).toEqual(new Set(['buendeln_100']));
	for (const a of erste.auftraege) await loese(page, a);

	await expect(page.getByText('Geschafft!')).toBeVisible();
	const mehr = await sessionAntwort(page, () =>
		tippeUnten(page, page.getByRole('button', { name: 'Noch 5 Aufgaben' }))
	);
	expect(mehr.auftraege).toHaveLength(5);
	for (const a of mehr.auftraege) await loese(page, a);

	await tippeUnten(page, page.getByRole('button', { name: 'Fertig' }));
	await expect(page).toHaveURL('/');

	const sql = datenbank();
	const [s] =
		await sql`select finished_at, item_count, correct_count from session where id = ${erste.session_id}`;
	const versuche =
		await sql`select correct, hint_used, block from attempt where session_id = ${erste.session_id}`;
	const [karte] = await sql`select state, reps, introduced_at,
		(due at time zone 'Europe/Berlin')::date - (now() at time zone 'Europe/Berlin')::date as tage
		from card join student on student.id = card.student_id
		where card.skill_id = 'buendeln_100' and student.label = ${SCHUELER.label}`;
	await sql.end();
	// 3 begleitete + 5 Prüfung + 5 Verlängerung; Beispiele werden nicht beantwortet
	expect(s.finished_at).not.toBeNull();
	expect(s.item_count).toBe(13);
	expect(s.correct_count).toBe(13);
	expect(versuche.filter((v) => v.block === 'pruefung')).toHaveLength(5);
	expect(versuche.every((v) => v.correct && !v.hint_used)).toBe(true);
	// Prüfrunde fehlerfrei und schneller als die Zielzeit: Easy, aus der Einführung wird eine Review-Karte
	expect(karte.state).toBe(2);
	expect(karte.reps).toBe(1);
	expect(karte.introduced_at).not.toBeNull();
	expect(karte.tage).toBe(8);
});

test('zweimal falsch: Wiederholung mit Material, dann Lösung als Animation und weiter', async ({
	page
}) => {
	await anmelden(page);
	const s = await sessionAntwort(page, () => page.goto('/ueben'));
	// heute schon eingeführt und nichts fällig: Aufwärmen, freies Üben, Abschluss
	expect([...new Set(s.auftraege.map((a) => a.block))]).toEqual([
		'aufwaermen',
		'uebung',
		'abschluss'
	]);
	const falsch = async () => {
		const fertig = page.getByRole('button', { name: 'Fertig' });
		if (await fertig.count()) return tippeUnten(page, fertig);
		await tippeUnten(page, page.getByRole('button', { name: '1', exact: true }));
		await tippeUnten(page, page.getByRole('button', { name: 'Bestätigen' }));
	};
	await falsch();
	// keine Fehlermeldung, dieselbe Aufgabe noch einmal
	await expect(page.getByTestId('prompt')).toBeVisible();
	await expect(page.getByText(/falsch/i)).toHaveCount(0);
	await falsch();
	await expect(page.getByTestId('loesung')).toBeVisible();
	await tippeUnten(page, page.getByRole('button', { name: 'Weiter' }));
	await expect(page.locator('ol[aria-label="Fortschritt"] li').nth(1)).toHaveClass(/bg-slate-800/);

	const sql = datenbank();
	const versuche =
		await sql`select correct, hint_used, error_tag from attempt where session_id = ${s.session_id} order by created_at`;
	await sql.end();
	expect(versuche.map((v) => [v.correct, v.hint_used])).toEqual([
		[false, false],
		[false, true]
	]);
	expect(versuche.every((v) => typeof v.error_tag === 'string')).toBe(true);
});

test('der Server bewertet selbst und nimmt keine veränderten Aufträge an', async ({ page }) => {
	await anmelden(page);
	const s: SessionAntwort = await (await page.request.get('/api/session/next')).json();
	const auftrag = s.auftraege[0];
	const item = SKILLS.get(auftrag.skill_id)!.generator!.generate(auftrag.params, auftrag.seed);
	const melde = (a: Auftrag, answer: unknown) =>
		page.request.post('/api/attempt', {
			data: {
				attempt_uuid: crypto.randomUUID(),
				session_id: s.session_id,
				auftrag: a,
				answer,
				duration_ms: 1000,
				hint_used: false
			}
		});

	const richtig = await melde(auftrag, item.loesung);
	expect(await richtig.json()).toEqual({ correct: true, error_tag: null });
	// anderer Seed oder andere Rolle mit altem Token: abgelehnt
	expect((await melde({ ...auftrag, seed: auftrag.seed + 1 }, item.loesung)).status()).toBe(400);
	expect((await melde({ ...auftrag, block: 'wiederholung' }, item.loesung)).status()).toBe(400);
});
