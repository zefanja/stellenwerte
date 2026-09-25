import { json } from '@sveltejs/kit';
import { requireTeacher } from '$lib/server/auth/guard';
import { eigenerSchueler } from '$lib/server/dashboard/daten';
import { datenAuskunft } from '$lib/server/verwaltung';

/** Alle Daten eines Schülers als JSON, damit Auskunftsersuchen ohne Entwicklerhilfe gehen */
export async function GET({ locals, params }) {
	const t = requireTeacher(locals);
	const s = await eigenerSchueler(t.id, params.id);
	return json(await datenAuskunft(s.id), {
		headers: {
			'content-disposition': `attachment; filename="schueler-${s.id.slice(0, 8)}.json"`,
			'cache-control': 'no-store'
		}
	});
}
