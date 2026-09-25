import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';

export async function GET() {
	try {
		await db.execute(sql`select 1`);
		return new Response('ok');
	} catch {
		return new Response('db unavailable', { status: 503 });
	}
}
