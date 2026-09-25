import type { Cookies } from '@sveltejs/kit';
import { and, eq, isNotNull } from 'drizzle-orm';
import { dev } from '$app/environment';
import { db } from '$lib/server/db';
import { student } from '$lib/server/db/schema';
import { readCookie, signCookie } from './crypto';

/** Eigener Cookie-Name, kein gemeinsamer Namensraum mit der Lehrkraft. */
export const STUDENT_COOKIE = 'swt_schueler';
const MAX_AGE = 180 * 24 * 60 * 60;

export function setStudentCookie(cookies: Cookies, studentId: string) {
	cookies.set(STUDENT_COOKIE, signCookie('schueler', studentId, MAX_AGE), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: MAX_AGE
	});
}

export function clearStudentCookie(cookies: Cookies) {
	cookies.delete(STUDENT_COOKIE, { path: '/' });
}

/**
 * Schüler zum Cookie, sofern er aktiv ist, einen Code hat und das Cookie nach dem letzten
 * Codewechsel ausgestellt wurde. Ein neuer Code meldet so alle Geräte sofort ab.
 */
export async function studentFromCookie(cookies: Cookies) {
	const payload = readCookie('schueler', cookies.get(STUDENT_COOKIE));
	if (!payload) return null;
	const [row] = await db
		.select({
			id: student.id,
			label: student.label,
			groupId: student.groupId,
			codeLastRotated: student.codeLastRotated
		})
		.from(student)
		.where(
			and(eq(student.id, payload.id), eq(student.archived, false), isNotNull(student.codeHash))
		);
	if (!row || payload.iat < row.codeLastRotated.getTime()) {
		clearStudentCookie(cookies);
		return null;
	}
	return { id: row.id, label: row.label, groupId: row.groupId };
}
