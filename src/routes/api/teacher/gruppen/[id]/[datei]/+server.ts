import { error } from '@sveltejs/kit';
import { requireOwnGroup } from '$lib/server/auth/guard';
import { exportDaten, fehlerText } from '$lib/server/dashboard/daten';
import { csv, STATUS_TEXT, zellStatus } from '$lib/dashboard/regeln';
import { tagVon } from '$lib/server/planung/zeit';
import { KATALOG, SKILLS } from '$lib/skills/katalog';

/**
 * CSV-Exporte einer Gruppe:
 * - stand.csv: Schüler, Skill, Zustand, Fälligkeit, Trefferquote (erste Versuche)
 * - fehler.csv: Anzahl der Fehlversuche je Schüler, Skill und Fehlertyp
 */
export async function GET({ locals, params }) {
	const gruppe = await requireOwnGroup(locals, params.id);
	const d = await exportDaten(gruppe.id);
	const name = (id: string) => d.schueler.find((s) => s.id === id)?.label ?? '';
	const dateiname = `${gruppe.name.replace(/[^\p{L}\p{N}_-]+/gu, '_')}_${params.datei}`;
	let inhalt: string;

	if (params.datei === 'stand.csv') {
		const skills = KATALOG.filter((s) => s.generator);
		inhalt = csv(
			[
				'Schüler',
				'Skill',
				'Zustand',
				'Stabilität (Tage)',
				'Fällig am',
				'Wiederholungen',
				'Versuche',
				'Trefferquote (%)'
			],
			d.schueler.flatMap((s) =>
				skills.map((sk) => {
					const k = d.karten.find((k) => k.studentId === s.id && k.skillId === sk.id);
					const q = d.quoten.find((q) => q.studentId === s.id && q.skillId === sk.id);
					const gelernt = k && k.state !== 0;
					return [
						s.label,
						sk.titel,
						k?.state === 0 && k.againInFolge < 2 ? 'in Einführung' : STATUS_TEXT[zellStatus(k)],
						gelernt ? Math.round(k.stability * 10) / 10 : null,
						gelernt ? tagVon(k.due) : null,
						k?.reps ?? 0,
						q?.versuche ?? 0,
						q && q.versuche > 0 ? Math.round((1000 * q.richtig) / q.versuche) / 10 : null
					];
				})
			)
		);
	} else if (params.datei === 'fehler.csv') {
		inhalt = csv(
			['Schüler', 'Skill', 'Fehlertyp', 'Beschreibung', 'Anzahl'],
			d.fehler.map((f) => [
				name(f.studentId),
				SKILLS.get(f.skillId)?.titel ?? f.skillId,
				f.tag ?? '',
				fehlerText(f.tag),
				f.n
			])
		);
	} else error(404, 'Unbekannter Export');

	return new Response(inhalt, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(dateiname)}`,
			'cache-control': 'no-store'
		}
	});
}
