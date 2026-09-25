import { json } from '@sveltejs/kit';
import { clearStudentCookie } from '$lib/server/auth/student';

export function POST({ cookies }) {
	clearStudentCookie(cookies);
	return json({ ok: true });
}
