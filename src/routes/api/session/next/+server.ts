import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { trainingSession } from '$lib/server/db/schema';
import { planeSession, planeVerlaengerung } from '$lib/server/planung/sessionplan';
import {
	auftraegeAus,
	beginneEinfuehrung,
	eigeneSession,
	freigegebeneWoche,
	ladeKarten,
	schliesseOffeneAb,
	schonWiederholt
} from '$lib/server/training';
import { KATALOG } from '$lib/skills/katalog';
import { Rng, neuerSeed } from '$lib/skills/rng';
import type { SessionAntwort } from '$lib/training';

/**
 * Ohne Parameter: neue Session nach FSRS-Plan (Aufwärmen, fällige Karten, Einführung, Abschluss).
 * Mit `?session=<id>`: freiwillige Verlängerung derselben Session um fünf Aufgaben.
 */
export async function GET({ locals, url }) {
	const s = locals.student!;
	const jetzt = new Date();
	const bisWoche = await freigegebeneWoche(s.id);
	const zufall = new Rng(neuerSeed());
	const bestehend = url.searchParams.get('session');

	if (bestehend) {
		const session = await eigeneSession(s.id, bestehend);
		if (!session) error(404, 'Session nicht gefunden');
		const bloecke = planeVerlaengerung({
			karten: await ladeKarten(s.id),
			jetzt,
			bisWoche,
			katalog: KATALOG,
			zufall,
			schonWiederholt: await schonWiederholt(session.id)
		});
		return json({
			session_id: session.id,
			auftraege: auftraegeAus(session.id, bloecke, bisWoche)
		} satisfies SessionAntwort);
	}

	await schliesseOffeneAb(s.id);
	const plan = planeSession({
		karten: await ladeKarten(s.id),
		jetzt,
		bisWoche,
		katalog: KATALOG,
		zufall
	});
	if (plan.einzufuehren) await beginneEinfuehrung(s.id, plan.einzufuehren, jetzt);
	const [session] = await db
		.insert(trainingSession)
		.values({ studentId: s.id })
		.returning({ id: trainingSession.id });
	return json({
		session_id: session.id,
		auftraege: auftraegeAus(session.id, plan.bloecke, bisWoche)
	} satisfies SessionAntwort);
}
