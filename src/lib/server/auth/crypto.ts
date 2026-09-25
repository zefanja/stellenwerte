import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { env } from '$env/dynamic/private';

function secret(): Buffer {
	if (!env.SECRET_KEY || env.SECRET_KEY.length < 32) throw new Error('SECRET_KEY is not set');
	return Buffer.from(env.SECRET_KEY, 'utf8');
}

function hmac(data: string): Buffer {
	return createHmac('sha256', secret()).update(data).digest();
}

/** Sechsstelliger Code aus kryptografisch sicherem Zufall. */
export function generateCode(): string {
	return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Nicht umkehrbarer Kurzindex: erste 3 Bytes des HMAC, als Suchfeld für den Login. */
export function codeIndex(code: string): string {
	return hmac(`code:${code}`).subarray(0, 3).toString('hex');
}

export const hashSecret = (plain: string) => hash(plain);
export const verifySecret = (hashed: string, plain: string) =>
	verify(hashed, plain).catch(() => false);

export type CookieKind = 'lehrer' | 'schueler';

interface CookiePayload {
	k: CookieKind;
	id: string;
	/** ausgestellt, ms seit Epoch */
	iat: number;
	/** läuft ab, ms seit Epoch */
	exp: number;
}

export function signCookie(kind: CookieKind, id: string, maxAgeSeconds: number): string {
	const now = Date.now();
	const payload: CookiePayload = { k: kind, id, iat: now, exp: now + maxAgeSeconds * 1000 };
	const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
	return `${body}.${hmac(`cookie:${body}`).toString('base64url')}`;
}

/** Prüft Signatur, Art und Ablauf. Gibt die Nutzlast zurück oder null. */
export function readCookie(kind: CookieKind, value: string | undefined): CookiePayload | null {
	if (!value) return null;
	const [body, sig] = value.split('.');
	if (!body || !sig) return null;
	const expected = hmac(`cookie:${body}`);
	const given = Buffer.from(sig, 'base64url');
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
	try {
		const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as CookiePayload;
		if (payload.k !== kind || typeof payload.id !== 'string' || payload.exp < Date.now())
			return null;
		return payload;
	} catch {
		return null;
	}
}
