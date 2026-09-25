import { createHmac } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { pgOptions } from '../src/lib/server/db/connection.js';
import { TEST_DATABASE_URL } from '../playwright.config';
import { LEHRKRAFT, SCHUELER } from './testdaten';

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
	await client.end();
}
