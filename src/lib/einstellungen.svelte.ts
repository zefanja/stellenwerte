/** Einstellungen des Kindes auf diesem Gerät. Nur Komfort, daher localStorage mit Fallback. */
const SCHLUESSEL = 'swt_animationen';

export const einstellungen = $state({ animationen: true });

export function ladeEinstellungen() {
	try {
		const gespeichert = localStorage.getItem(SCHLUESSEL);
		einstellungen.animationen =
			gespeichert === null
				? !matchMedia('(prefers-reduced-motion: reduce)').matches
				: gespeichert === '1';
	} catch {
		// privates Fenster o. Ä.: Standard behalten
	}
}

export function setzeAnimationen(an: boolean) {
	einstellungen.animationen = an;
	try {
		localStorage.setItem(SCHLUESSEL, an ? '1' : '0');
	} catch {
		// ignorieren
	}
}
