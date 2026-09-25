import { eigenerSchueler, schuelerProfil, ZEITACHSE_TAGE } from '$lib/server/dashboard/daten';
import { requireTeacher } from '$lib/server/auth/guard';
import { plusTage, tagVon } from '$lib/server/planung/zeit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const t = requireTeacher(locals);
	const schueler = await eigenerSchueler(t.id, params.id);
	const jetzt = new Date();
	const profil = await schuelerProfil(schueler.id, jetzt);

	// Zeitachse: volle Wochen Montag bis Sonntag, die letzte endet mit der aktuellen Woche
	const heute = tagVon(jetzt);
	const wochentag = (new Date(`${heute}T12:00:00Z`).getUTCDay() + 6) % 7; // Mo = 0
	const start = plusTage(heute, -wochentag - (ZEITACHSE_TAGE - 7));
	const jeTag = new Map(profil.tage.map((t) => [t.tag, t]));
	const zeitachse = Array.from({ length: ZEITACHSE_TAGE }, (_, i) => {
		const tag = plusTage(start, i);
		return {
			tag,
			zukunft: tag > heute,
			...(jeTag.get(tag) ?? { sessions: 0, aufgaben: 0, richtig: 0 })
		};
	});

	return { schueler, ...profil, zeitachse };
};
