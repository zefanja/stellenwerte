import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { dev } from '$app/environment';
import { db } from '$lib/server/db';
import { teacher } from '$lib/server/db/schema';
import { readCookie, signCookie } from './crypto';

/** Eigener Cookie-Name, kein gemeinsamer Namensraum mit Schülern. */
export const TEACHER_COOKIE = 'swt_lehrer';
const MAX_AGE = 12 * 60 * 60;

export function setTeacherCookie(cookies: Cookies, teacherId: string) {
	cookies.set(TEACHER_COOKIE, signCookie('lehrer', teacherId, MAX_AGE), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: MAX_AGE
	});
}

export function clearTeacherCookie(cookies: Cookies) {
	cookies.delete(TEACHER_COOKIE, { path: '/' });
}

export async function teacherFromCookie(cookies: Cookies) {
	const payload = readCookie('lehrer', cookies.get(TEACHER_COOKIE));
	if (!payload) return null;
	const [row] = await db
		.select({ id: teacher.id, email: teacher.email })
		.from(teacher)
		.where(eq(teacher.id, payload.id));
	return row ?? null;
}
