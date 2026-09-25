import type { Auftrag } from '$lib/training';

/**
 * Laufende Session auf dem Gerät, damit sie nach einem Neuladen ohne Netz weitergeht.
 * Gilt nur am selben Tag; danach plant der Server neu.
 */
export interface Sitzung {
	tag: string;
	sessionId: string;
	auftraege: Auftrag[];
	index: number;
	ergebnisse: (boolean | null)[];
	verlaengerungen: number;
}

const SCHLUESSEL = 'swt_sitzung';
const heute = () => new Date().toLocaleDateString('sv-SE');

export function speichereSitzung(s: Omit<Sitzung, 'tag'>) {
	try {
		localStorage.setItem(SCHLUESSEL, JSON.stringify({ ...s, tag: heute() }));
	} catch {
		// ohne localStorage kein Fortsetzen nach dem Neuladen
	}
}

export function ladeSitzung(): Sitzung | null {
	try {
		const s = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? 'null') as Sitzung | null;
		return s && s.tag === heute() && s.index < s.auftraege.length ? s : null;
	} catch {
		return null;
	}
}

export function loescheSitzung() {
	try {
		localStorage.removeItem(SCHLUESSEL);
	} catch {
		// nichts zu tun
	}
}
