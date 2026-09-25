import { json } from '@sveltejs/kit';
import { findStudentByCode } from '$lib/server/auth/codes';
import { studentLoginLimiter } from '$lib/server/auth/ratelimit';
import { setStudentCookie } from '$lib/server/auth/student';

/**
 * Zweistufig, damit Kinder nicht auf fremden Konten trainieren:
 * 1. `{ code }` prüft den Code und liefert nur das Label für die Rückfrage „Bist du das?“.
 * 2. `{ code, bestaetigt: true }` prüft erneut und setzt erst dann das Schüler-Cookie.
 * Nur Fehlversuche zählen fürs Rate Limit (10 pro Minute und IP, dann 60 s Sperre).
 */
export async function POST({ request, cookies, getClientAddress }) {
	const ip = getClientAddress();
	const wait = studentLoginLimiter.blockedFor(ip);
	if (wait > 0) return json({ fehler: 'gesperrt', warten: wait }, { status: 429 });

	const body = await request.json().catch(() => null);
	const code = typeof body?.code === 'string' ? body.code : '';
	if (!/^\d{6}$/.test(code)) return json({ fehler: 'format' }, { status: 400 });

	const match = await findStudentByCode(code);
	console.info(
		JSON.stringify({
			event: 'student_login',
			ok: !!match,
			confirm: body?.bestaetigt === true,
			ip,
			at: new Date().toISOString()
		})
	);
	if (!match) {
		studentLoginLimiter.recordFailure(ip);
		const warten = studentLoginLimiter.blockedFor(ip);
		return warten > 0
			? json({ fehler: 'gesperrt', warten }, { status: 429 })
			: json({ fehler: 'falsch' }, { status: 401 });
	}

	if (body?.bestaetigt === true) {
		setStudentCookie(cookies, match.id);
		return json({ ok: true });
	}
	return json({ label: match.label });
}
