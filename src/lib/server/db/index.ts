import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { pgOptions } from './connection.js';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres({ ...pgOptions(env.DATABASE_URL), onnotice: () => {} });

export const db = drizzle(client, { schema });

/** Wird beim Serverstart aufgerufen; Migrationen liegen in ./drizzle. */
export async function runMigrations() {
	await migrate(db, { migrationsFolder: 'drizzle' });
}
