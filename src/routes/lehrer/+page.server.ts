import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { teacher } from '$lib/server/db/schema';
import { verifySecret } from '$lib/server/auth/crypto';
import { teacherLoginLimiter } from '$lib/server/auth/ratelimit';
import { setTeacherCookie } from '$lib/server/auth/teacher';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.teacher) redirect(303, '/lehrer/gruppen');
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const ip = getClientAddress();
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');

		const wait = teacherLoginLimiter.blockedFor(ip);
		if (wait > 0)
			return fail(429, { email, message: `Zu viele Versuche. Bitte ${wait} s warten.` });

		const [row] = await db.select().from(teacher).where(eq(teacher.email, email));
		const ok = row ? await verifySecret(row.passwordHash, password) : false;
		console.info(
			JSON.stringify({ event: 'teacher_login', ok, email, ip, at: new Date().toISOString() })
		);

		if (!row || !ok) {
			teacherLoginLimiter.recordFailure(ip);
			return fail(400, { email, message: 'E-Mail oder Passwort falsch.' });
		}
		setTeacherCookie(cookies, row.id);
		redirect(303, '/lehrer/gruppen');
	}
};
