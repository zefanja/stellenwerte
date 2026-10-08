import { expect, test } from '@playwright/test';
import { SKILLS } from '../src/lib/skills/katalog';
import type { Auftrag, SessionAntwort } from '../src/lib/training';
import { anmelden, datenbank, tippeUnten } from './hilfen';
import { loese, sessionAntwort } from './loesen';
import { SCHUELER, SCHUELER_WOCHE45 } from './testdaten';

test.describe.configure({ mode: 'serial' });

test('erste Session: Einführung einhändig lösbar, Verlängerung, danach FSRS-Karte', async ({
	page
}) => {
	test.setTimeout(60_000);
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
	// Die Einführung wird angekündigt, bevor „Schau zu“ beginnt
	await expect(page.getByTestId('ankuendigung')).toContainText('Neu');
	await expect(page.getByTestId('ankuendigung')).toContainText('Bündeln bis 100');
	for (const [i, a] of erste.auftraege.entries()) {
		// nach den Beispielen: „Jetzt bist du dran!“
		if (i === 2)
			await expect(page.getByTestId('ankuendigung')).toContainText('Jetzt bist du dran!');
		await loese(page, a);
	}

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
	const signal = async () => {
		await expect(page.getByTestId('falsch')).toBeVisible();
		await expect(page.getByTestId('falsch')).toBeHidden();
	};
	await falsch();
	// kurzes Signal ohne Text, dann dieselbe Aufgabe noch einmal
	await signal();
	await expect(page.getByTestId('prompt')).toBeVisible();
	await expect(page.getByText(/falsch/i)).toHaveCount(0);
	await falsch();
	await signal();
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

test('Wochen 4 bis 6: Stelle verändern, Rechenkette, Zahlenstrahl, Vergleichen, einhändig lösbar', async ({
	page
}) => {
	// gut zwanzig Aufgaben, nach jedem Aufgabenwechsel die kurze Sperre gegen Durchtippen
	test.setTimeout(60_000);
	const res = await page.request.post('/api/login', {
		data: { code: SCHUELER_WOCHE45.code, bestaetigt: true }
	});
	expect(res.ok()).toBe(true);
	const erste = await sessionAntwort(page, () => page.goto('/ueben'));
	const alle = [erste];
	for (const a of erste.auftraege) await loese(page, a);
	// zwei Verlängerungen holen die übrigen fälligen Skills
	for (let i = 0; i < 2; i++) {
		const mehr = await sessionAntwort(page, () =>
			tippeUnten(page, page.getByRole('button', { name: 'Noch 5 Aufgaben' }))
		);
		alle.push(mehr);
		for (const a of mehr.auftraege) await loese(page, a);
	}
	await tippeUnten(page, page.getByRole('button', { name: 'Fertig' }));
	await expect(page).toHaveURL('/');

	const geuebt = new Set(
		alle.flatMap((s) =>
			s.auftraege.filter((a) => a.block === 'wiederholung').map((a) => a.skill_id)
		)
	);
	expect([...geuebt].sort()).toEqual([...SCHUELER_WOCHE45.faellig].sort());

	const sql = datenbank();
	const karten =
		await sql`select skill_id, reps, again_in_folge from card join student on student.id = card.student_id
		where student.label = ${SCHUELER_WOCHE45.label} and skill_id in ${sql(SCHUELER_WOCHE45.faellig)}`;
	const falsch =
		await sql`select count(*)::int as n from attempt join student on student.id = attempt.student_id
		where student.label = ${SCHUELER_WOCHE45.label} and not correct`;
	await sql.end();
	// alle vier Wiederholungen bewertet, alles beim ersten Versuch richtig
	expect(karten.map((k) => k.reps)).toEqual([4, 4, 4, 4]);
	expect(falsch[0].n).toBe(0);
});
