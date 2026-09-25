import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { trainingSession } from '$lib/server/db/schema';
import { eigeneSession, freigegebeneWoche, waehleAuftraege } from '$lib/server/training';
import { SESSION_LAENGE, VERLAENGERUNG, type SessionAntwort } from '$lib/training';

/**
 * Ohne Parameter: neue Session mit zehn Aufträgen.
 * Mit `?session=<id>`: freiwillige Verlängerung derselben Session um fünf Aufträge.
 */
export async function GET({ locals, url }) {
	const s = locals.student!;
	const woche = await freigegebeneWoche(s.id);
	const bestehend = url.searchParams.get('session');

	if (bestehend) {
		const session = await eigeneSession(s.id, bestehend);
		if (!session) error(404, 'Session nicht gefunden');
		const antwort: SessionAntwort = {
			session_id: session.id,
			auftraege: waehleAuftraege(session.id, VERLAENGERUNG, woche)
		};
		return json(antwort);
	}

	const [session] = await db
		.insert(trainingSession)
		.values({ studentId: s.id })
		.returning({ id: trainingSession.id });
	const antwort: SessionAntwort = {
		session_id: session.id,
		auftraege: waehleAuftraege(session.id, SESSION_LAENGE, woche)
	};
	return json(antwort);
}
