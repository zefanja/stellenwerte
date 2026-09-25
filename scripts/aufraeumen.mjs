// Löscht Antworten (attempt), die älter als 12 Monate sind. Karten bleiben.
// Täglich per Crontab, z. B.: 17 3 * * * cd ~/stellenwerttraining && npm run aufraeumen
import postgres from 'postgres';
import { pgOptions } from '../src/lib/server/db/connection.js';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL ist nicht gesetzt.');
	process.exit(1);
}
const sql = postgres({ ...pgOptions(process.env.DATABASE_URL), onnotice: () => {} });
const geloescht = await sql`delete from attempt where created_at < now() - interval '12 months'`;
console.log(`${new Date().toISOString()} ${geloescht.count} Antworten älter als 12 Monate gelöscht.`);
await sql.end();
