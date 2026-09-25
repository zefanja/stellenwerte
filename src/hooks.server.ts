import { error, redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { runMigrations } from '$lib/server/db';
import { teacherFromCookie } from '$lib/server/auth/teacher';
import { studentFromCookie } from '$lib/server/auth/student';

export const init: ServerInit = async () => {
	await runMigrations();
};

const PUBLIC_TEACHER_PATHS = new Set(['/lehrer']);
const PUBLIC_API_PATHS = new Set(['/api/login', '/api/logout']);

/**
 * Lehrer- und Schülerbereich sind strikt getrennt: Unter /lehrer und /api/teacher wird nur das
 * Lehrer-Cookie gelesen, überall sonst nur das Schüler-Cookie.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	event.locals.teacher = null;
	event.locals.student = null;

	if (path.startsWith('/lehrer') || path.startsWith('/api/teacher')) {
		event.locals.teacher = await teacherFromCookie(event.cookies);
		if (!event.locals.teacher && !PUBLIC_TEACHER_PATHS.has(path)) {
			if (path.startsWith('/api/')) error(401, 'Nicht angemeldet');
			redirect(303, '/lehrer');
		}
	} else if (path !== '/healthz') {
		event.locals.student = await studentFromCookie(event.cookies);
		if (!event.locals.student && path.startsWith('/api/') && !PUBLIC_API_PATHS.has(path)) {
			error(401, 'Nicht angemeldet');
		}
	}

	return resolve(event);
};
