import { createHmac } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { pgOptions } from '../src/lib/server/db/connection.js';
import { TEST_DATABASE_URL } from '../playwright.config';
import { KATALOG } from '../src/lib/skills/katalog';
import { DASHBOARD, LEHRKRAFT, SCHUELER, SCHUELER_OFFLINE, SCHUELER_WOCHE45 } from './testdaten';

/** Setzt die Test-Datenbank zurück und legt eine Lehrkraft mit einem Schüler mit bekanntem Code an. */
export default async function seed() {
	process.loadEnvFile('.env');
	const secret = process.env.SECRET_KEY!;
	const client = postgres({ ...pgOptions(TEST_DATABASE_URL), onnotice: () => {} });
	await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
	await client`truncate teacher, "group", student, card, session, attempt cascade`;

	const [t] =
		await client`insert into teacher (email, password_hash) values (${LEHRKRAFT.email}, ${await hash(LEHRKRAFT.password)}) returning id`;
	const [g] =
		await client`insert into "group" (teacher_id, name) values (${t.id}, 'E2E-Gruppe') returning id`;
	// gleicher Kurzindex wie codeIndex() in src/lib/server/auth/crypto.ts
	const index = createHmac('sha256', Buffer.from(secret, 'utf8'))
		.update(`code:${SCHUELER.code}`)
		.digest()
		.subarray(0, 3)
		.toString('hex');
	await client`insert into student (group_id, label, code_hash, code_index, code_last_rotated)
		values (${g.id}, ${SCHUELER.label}, ${await hash(SCHUELER.code)}, ${index}, now() - interval '1 minute')`;

	const index2 = createHmac('sha256', Buffer.from(secret, 'utf8'))
		.update(`code:${SCHUELER_WOCHE45.code}`)
		.digest()
		.subarray(0, 3)
		.toString('hex');
	const [s2] =
		await client`insert into student (group_id, label, code_hash, code_index, code_last_rotated)
		values (${g.id}, ${SCHUELER_WOCHE45.label}, ${await hash(SCHUELER_WOCHE45.code)}, ${index2}, now() - interval '1 minute') returning id`;
	await client`insert into card (student_id, skill_id, state, stability, difficulty, due, last_review, reps, introduced_at)
		values (${s2.id}, 'buendeln_100', 2, 40, 5, now() + interval '10 days', now() - interval '30 days', 5, now() - interval '60 days')`;
	for (const [i, skill] of SCHUELER_WOCHE45.faellig.entries()) {
		await client`insert into card (student_id, skill_id, state, stability, difficulty, due, last_review, reps, introduced_at)
			values (${s2.id}, ${skill}, 2, 5, 5, now() - ${4 - i} * interval '1 day', now() - interval '10 days', 3, now() - interval '30 days')`;
	}

	const index3 = createHmac('sha256', Buffer.from(secret, 'utf8'))
		.update(`code:${SCHUELER_OFFLINE.code}`)
		.digest()
		.subarray(0, 3)
		.toString('hex');
	await client`insert into student (group_id, label, code_hash, code_index, code_last_rotated)
		values (${g.id}, ${SCHUELER_OFFLINE.label}, ${await hash(SCHUELER_OFFLINE.code)}, ${index3}, now() - interval '1 minute')`;

	await seedDashboard(client, t.id);
	await client.end();
}

/** Karten nach DASHBOARD.erwartet, dazu für Anna eine Session mit bekannten Fehlversuchen */
async function seedDashboard(client: postgres.Sql, teacherId: string) {
	const [g] =
		await client`insert into "group" (teacher_id, name) values (${teacherId}, ${DASHBOARD.gruppe}) returning id`;
	const kartenwerte = {
		gruen: { state: 2, stability: 30, again_in_folge: 0 },
		gelb: { state: 2, stability: 5, again_in_folge: 0 },
		rot: { state: 2, stability: 2, again_in_folge: 2 }
	} as const;
	const ids: Record<string, string> = {};
	for (const [label, karten] of Object.entries(DASHBOARD.erwartet)) {
		const [s] =
			await client`insert into student (group_id, label) values (${g.id}, ${label}) returning id`;
		ids[label] = s.id;
		for (const [skill, farbe] of Object.entries(karten)) {
			// Ben: Skill in der Einführung (state 0) ist ebenfalls gelb
			const k =
				label === 'Ben'
					? { state: 0, stability: 0, again_in_folge: 0 }
					: kartenwerte[farbe as keyof typeof kartenwerte];
			await client`insert into card (student_id, skill_id, state, stability, difficulty, due, introduced_at, again_in_folge)
				values (${s.id}, ${skill}, ${k.state}, ${k.stability}, 5, now() + interval '3 days', now() - interval '20 days', ${k.again_in_folge})`;
		}
	}

	// Anna übt vor zwei Tagen: 3× Ziffer statt Bündel, 1× Zählfehler, 2 richtige
	const [session] = await client`insert into session (student_id, started_at, finished_at)
		values (${ids.Anna}, now() - interval '2 days', now() - interval '2 days') returning id`;
	const skill = KATALOG.find((s) => s.id === 'buendel_zaehlen')!;
	for (const [seed, art] of [
		[1, 'ziffer'],
		[2, 'ziffer'],
		[3, 'ziffer'],
		[4, 'eins'],
		[5, 'richtig'],
		[6, 'richtig']
	] as const) {
		const item = skill.generator!.generate(skill.params_default, seed);
		const loesung = item.loesung.typ === 'zahl' ? item.loesung.wert : 0;
		const antwort =
			art === 'ziffer'
				? item.distraktoren.find((d) => d.error_tag === 'ziffer_statt_buendel')!.antwort
				: { typ: 'zahl', wert: art === 'eins' ? loesung + 1 : loesung };
		const tag =
			art === 'ziffer' ? 'ziffer_statt_buendel' : art === 'eins' ? 'zaehlfehler_eins' : null;
		await client`insert into attempt (attempt_uuid, student_id, skill_id, session_id, seed, block, params_json, answer_json, correct, error_tag, duration_ms, created_at)
			values (gen_random_uuid(), ${ids.Anna}, ${skill.id}, ${session.id}, ${seed}, 'wiederholung', ${JSON.stringify(skill.params_default)}::jsonb,
				${JSON.stringify(antwort)}::jsonb, ${art === 'richtig'}, ${tag}, 8000, now() - interval '2 days' + ${seed} * interval '1 minute')`;
	}

	// ältere Fehlversuche (vor 31 Tagen): füllen die Liste der letzten zehn, zählen aber nicht zu den 4 Wochen
	const mzz = KATALOG.find((s) => s.id === 'material_zu_zahl')!;
	for (let seed = 1; seed <= 8; seed++) {
		await client`insert into attempt (attempt_uuid, student_id, skill_id, session_id, seed, block, params_json, answer_json, correct, error_tag, duration_ms, created_at)
			values (gen_random_uuid(), ${ids.Anna}, ${mzz.id}, ${session.id}, ${seed}, 'wiederholung', ${JSON.stringify(mzz.params_default)}::jsonb,
				${JSON.stringify({ typ: 'zahl', wert: 1 })}::jsonb, false, 'sonstiges', 9000, now() - interval '31 days' + ${seed} * interval '1 minute')`;
	}
}
