import { fail, redirect } from '@sveltejs/kit';
import { and, asc, count, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { student, studentGroup } from '$lib/server/db/schema';
import { requireTeacher } from '$lib/server/auth/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const t = requireTeacher(locals);
	const groups = await db
		.select({
			id: studentGroup.id,
			name: studentGroup.name,
			activeTrack: studentGroup.activeTrack,
			students: count(student.id)
		})
		.from(studentGroup)
		.leftJoin(student, and(eq(student.groupId, studentGroup.id), eq(student.archived, false)))
		.where(eq(studentGroup.teacherId, t.id))
		.groupBy(studentGroup.id)
		.orderBy(asc(studentGroup.name));
	return { groups };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const t = requireTeacher(locals);
		const name = String((await request.formData()).get('name') ?? '').trim();
		if (!name || name.length > 80)
			return fail(400, { message: 'Bitte einen Gruppennamen (max. 80 Zeichen) angeben.' });
		const [group] = await db
			.insert(studentGroup)
			.values({ teacherId: t.id, name })
			.returning({ id: studentGroup.id });
		redirect(303, `/lehrer/gruppen/${group.id}`);
	}
};
