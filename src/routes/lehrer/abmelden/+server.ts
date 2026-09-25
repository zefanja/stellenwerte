import { redirect } from '@sveltejs/kit';
import { clearTeacherCookie } from '$lib/server/auth/teacher';

export function POST({ cookies }) {
	clearTeacherCookie(cookies);
	redirect(303, '/lehrer');
}
