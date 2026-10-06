import { fail } from '@sveltejs/kit';
import { and, asc, eq, ne } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { student, studentGroup } from '$lib/server/db/schema';
import { requireOwnGroup } from '$lib/server/auth/guard';
import {
	archivieren,
	einSchuelerDerGruppe,
	loeschen,
	neueCodes,
	schuelerDerGruppe,
	verschieben,
	zuruecksetzen
} from '$lib/server/verwaltung';
import type { Actions, PageServerLoad } from './$types';

const MAX_LABEL = 40;
const MAX_PER_REQUEST = 60;

export const load: PageServerLoad = async ({ locals, params }) => {
	const group = await requireOwnGroup(locals, params.id);
	const [students, andereGruppen] = await Promise.all([
		schuelerDerGruppe(group.id),
		db
			.select({ id: studentGroup.id, name: studentGroup.name })
			.from(studentGroup)
			.where(and(eq(studentGroup.teacherId, locals.teacher!.id), ne(studentGroup.id, group.id)))
			.orderBy(asc(studentGroup.name))
	]);
	return {
		group: { id: group.id, name: group.name, activeTrack: group.activeTrack },
		students,
		andereGruppen
	};
};

export const actions: Actions = {
	rename: async ({ locals, params, request }) => {
		const group = await requireOwnGroup(locals, params.id);
		const name = String((await request.formData()).get('name') ?? '').trim();
		if (!name || name.length > 80)
			return fail(400, { message: 'Bitte einen Gruppennamen (max. 80 Zeichen) angeben.' });
		await db.update(studentGroup).set({ name }).where(eq(studentGroup.id, group.id));
	},

	track: async ({ locals, params, request }) => {
		const group = await requireOwnGroup(locals, params.id);
		const track = Number((await request.formData()).get('activeTrack'));
		if (!Number.isInteger(track) || track < 1 || track > 6)
			return fail(400, { message: 'Woche 1 bis 6 wählen.' });
		await db.update(studentGroup).set({ activeTrack: track }).where(eq(studentGroup.id, group.id));
	},

	addStudents: async ({ locals, params, request }) => {
		const group = await requireOwnGroup(locals, params.id);
		const labels = String((await request.formData()).get('labels') ?? '')
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter(Boolean);
		if (labels.length === 0)
			return fail(400, { message: 'Mindestens ein Kürzel eingeben, eines pro Zeile.' });
		if (labels.length > MAX_PER_REQUEST)
			return fail(400, { message: `Höchstens ${MAX_PER_REQUEST} Schüler auf einmal.` });
		const tooLong = labels.find((l) => l.length > MAX_LABEL);
		if (tooLong)
			return fail(400, { message: `Kürzel zu lang (max. ${MAX_LABEL} Zeichen): ${tooLong}` });

		const created = await db
			.insert(student)
			.values(labels.map((label) => ({ groupId: group.id, label })))
			.returning({ id: student.id, label: student.label });
		return neueCodes(locals.teacher!.id, created);
	},

	/** Neuer Code für einen Schüler, oder ohne `student` für die ganze Gruppe */
	codes: async ({ locals, params, request }) => {
		const group = await requireOwnGroup(locals, params.id);
		const id = (await request.formData()).get('student');
		const schueler = id
			? [await einSchuelerDerGruppe(group.id, id)]
			: await schuelerDerGruppe(group.id);
		if (schueler.length === 0) return fail(400, { message: 'Keine Schüler in dieser Gruppe.' });
		return neueCodes(locals.teacher!.id, schueler);
	},

	move: async ({ locals, params, request }) => {
		const group = await requireOwnGroup(locals, params.id);
		const form = await request.formData();
		const s = await einSchuelerDerGruppe(group.id, form.get('student'));
		await verschieben(locals.teacher!.id, s.id, form.get('ziel'));
		return { message: `${s.label} wurde verschoben.` };
	},

	/** Archivieren eines Schülers, oder ohne `student` der ganzen Gruppe (Schuljahresende) */
	archive: async ({ locals, params, request }) => {
		const group = await requireOwnGroup(locals, params.id);
		const form = await request.formData();
		const id = form.get('student');
		const schueler = id
			? [await einSchuelerDerGruppe(group.id, id)]
			: await schuelerDerGruppe(group.id);
		const behalten = form.get('daten') !== 'loeschen';
		await archivieren(
			schueler.map((s) => s.id),
			behalten
		);
		return {
			message: `${schueler.length} archiviert${behalten ? ', Lernstand anonymisiert behalten' : ', alle Daten gelöscht'}.`
		};
	},

	reset: async ({ locals, params, request }) => {
		const group = await requireOwnGroup(locals, params.id);
		const s = await einSchuelerDerGruppe(group.id, (await request.formData()).get('student'));
		await zuruecksetzen(s.id);
		return { message: `Lernstand von ${s.label} wurde zurückgesetzt.` };
	},

	delete: async ({ locals, params, request }) => {
		const group = await requireOwnGroup(locals, params.id);
		const s = await einSchuelerDerGruppe(group.id, (await request.formData()).get('student'));
		await loeschen([s.id]);
		return { message: `${s.label} und alle zugehörigen Daten wurden gelöscht.` };
	}
};
