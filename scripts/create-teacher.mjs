// Legt eine Lehrkraft an (oder setzt ihr Passwort neu).
// Aufruf: npm run teacher:create -- lehrer@schule.de
// Das Passwort wird interaktiv abgefragt oder aus TEACHER_PASSWORD gelesen.
import { createInterface } from 'node:readline';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { hash } from '@node-rs/argon2';
import { pgOptions } from '../src/lib/server/db/connection.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@')) {
	console.error('Aufruf: npm run teacher:create -- <email>');
	process.exit(1);
}
if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL ist nicht gesetzt.');
	process.exit(1);
}

function askHidden(question) {
	return new Promise((resolve) => {
		const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
		rl._writeToOutput = (s) => {
			if (s.startsWith(question)) process.stdout.write(s);
		};
		rl.question(question, (answer) => {
			rl.close();
			process.stdout.write('\n');
			resolve(answer);
		});
	});
}

const password = process.env.TEACHER_PASSWORD ?? (await askHidden('Passwort (min. 10 Zeichen): '));
if (password.length < 10) {
	console.error('Passwort zu kurz.');
	process.exit(1);
}

const client = postgres({ ...pgOptions(process.env.DATABASE_URL), onnotice: () => {} });
const db = drizzle(client);
await migrate(db, { migrationsFolder: 'drizzle' });
const passwordHash = await hash(password);
await client`
	insert into teacher (email, password_hash) values (${email}, ${passwordHash})
	on conflict (email) do update set password_hash = excluded.password_hash`;
console.log(`Lehrkraft ${email} angelegt bzw. Passwort aktualisiert.`);
await client.end();
