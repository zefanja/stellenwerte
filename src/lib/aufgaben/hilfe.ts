import { STELLEN, normiert } from '$lib/skills/material';
import type { Item, Material, Stelle } from '$lib/skills/typen';

export type Modus = 'versuch' | 'hilfe' | 'loesung';

/**
 * Spalten für eine Tafel: von der höchsten belegten Stelle bis zu den Einern, eine Spalte mehr
 * links, wenn irgendwo zehn oder mehr Teile liegen (damit gebündelt werden kann).
 */
export function spaltenFuer(material: Material, auchStelle?: Stelle): Stelle[] {
	let hoechste = STELLEN.length - 2; // mindestens Z und E
	STELLEN.forEach((s, i) => {
		const n = material[s] ?? 0;
		if (n > 0) hoechste = Math.min(hoechste, n >= 10 ? Math.max(0, i - 1) : i);
	});
	if (auchStelle) hoechste = Math.min(hoechste, STELLEN.indexOf(auchStelle));
	return STELLEN.slice(hoechste);
}

/** Material, mit dem die Aufgabe beim zweiten Versuch gezeigt wird; null, wenn keins passt (> 9999) */
export function hilfsmaterial(item: Item): Material | null {
	const d = item.darstellung;
	switch (d.typ) {
		case 'material':
		case 'stellen':
			return d.material;
		case 'wegnahme':
			return d.material;
		case 'zahl':
			return {};
		case 'zahlwort':
			return item.loesung.typ === 'zahl' && item.loesung.wert <= 9999
				? normiert(item.loesung.wert)
				: null;
		case 'buendel':
			// Dezimalzahlen (Woche 6) ohne Material: die Tafel kennt nur ganze Stellen
			return Number.isInteger(d.zahl) && d.zahl <= 9999 ? normiert(d.zahl) : null;
		case 'buendel_umkehr':
			return d.anzahl * { T: 1000, H: 100, Z: 10, E: 1 }[d.stelle] <= 99_999
				? { [d.stelle]: d.anzahl }
				: null;
		case 'rechnung':
			return normiert(d.zahl);
		case 'kette':
			return normiert(d.start);
		case 'strahl':
		case 'vergleich':
			return null;
	}
}

/** Ganze Stelle der Tafel oder undefined (Dezimalstellen haben kein Material) */
export const tafelStelle = (s: string): Stelle | undefined =>
	['T', 'H', 'Z', 'E'].includes(s) ? (s as Stelle) : undefined;

/** Welche Tauschrichtungen im Hilfemodus sinnvoll sind */
export function tauschRichtungen(item: Item): { buendeln: boolean; tauschen: boolean } {
	switch (item.darstellung.typ) {
		case 'stellen':
		case 'buendel_umkehr':
			return { buendeln: true, tauschen: false };
		case 'buendel':
			return { buendeln: false, tauschen: true };
		case 'wegnahme':
		case 'rechnung':
			return { buendeln: true, tauschen: true };
		default:
			return { buendeln: false, tauschen: false };
	}
}
