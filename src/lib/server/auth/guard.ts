import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { studentGroup } from '$lib/server/db/schema';

export function requireTeacher(locals: App.Locals) {
	if (!locals.teacher) error(401, 'Nicht angemeldet');
	return locals.teacher;
}

/** Gruppe laden und sicherstellen, dass sie der angemeldeten Lehrkraft gehört. */
export async function requireOwnGroup(locals: App.Locals, groupId: string) {
	const t = requireTeacher(locals);
	if (!/^[0-9a-f-]{36}$/i.test(groupId)) error(404, 'Gruppe nicht gefunden');
	const [group] = await db
		.select()
		.from(studentGroup)
		.where(and(eq(studentGroup.id, groupId), eq(studentGroup.teacherId, t.id)));
	if (!group) error(404, 'Gruppe nicht gefunden');
	return group;
}
