import { error, redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { runMigrations } from '$lib/server/db';
import { teacherFromCookie } from '$lib/server/auth/teacher';

export const init: ServerInit = async () => {
	await runMigrations();
};

const PUBLIC_TEACHER_PATHS = new Set(['/lehrer']);

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	event.locals.teacher = null;

	if (path.startsWith('/lehrer') || path.startsWith('/api/teacher')) {
		event.locals.teacher = await teacherFromCookie(event.cookies);
		if (!event.locals.teacher && !PUBLIC_TEACHER_PATHS.has(path)) {
			if (path.startsWith('/api/')) error(401, 'Nicht angemeldet');
			redirect(303, '/lehrer');
		}
	}

	return resolve(event);
};
