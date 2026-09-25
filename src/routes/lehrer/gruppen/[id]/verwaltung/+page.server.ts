import { fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { student, studentGroup } from '$lib/server/db/schema';
import { requireOwnGroup } from '$lib/server/auth/guard';
import { assignNewCodes } from '$lib/server/auth/codes';
import type { Actions, PageServerLoad } from './$types';

const MAX_LABEL = 40;
const MAX_PER_REQUEST = 60;

export const load: PageServerLoad = async ({ locals, params }) => {
	const group = await requireOwnGroup(locals, params.id);
	const students = await db
		.select({ id: student.id, label: student.label, hasCode: student.codeHash })
		.from(student)
		.where(and(eq(student.groupId, group.id), eq(student.archived, false)))
		.orderBy(asc(student.label));
	return {
		group: { id: group.id, name: group.name, activeTrack: group.activeTrack },
		students: students.map((s) => ({ id: s.id, label: s.label, hasCode: s.hasCode !== null }))
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
		const raw = String((await request.formData()).get('labels') ?? '');
		const labels = raw
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
		const codes = await assignNewCodes(created.map((s) => s.id));
		// Klartext-Codes verlassen den Server genau einmal, in dieser Antwort.
		return { newCodes: created.map((s) => ({ label: s.label, code: codes.get(s.id)! })) };
	}
};
