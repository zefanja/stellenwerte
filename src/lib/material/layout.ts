import { Rng } from '$lib/skills/rng';
import type { Stelle } from '$lib/skills/typen';

/** Rechteck in Pixeln, links oben verankert */
export interface Rahmen {
	x: number;
	y: number;
	b: number;
	h: number;
}

export type Lage = 'stehend' | 'liegend';

/** Größe eines Teils bei Einheit u (Kantenlänge eines Einerwürfels) */
export function teilGroesse(
	art: Stelle,
	u: number,
	lage: Lage = 'stehend'
): { b: number; h: number } {
	switch (art) {
		case 'E':
			return { b: u, h: u };
		case 'Z':
			return lage === 'stehend' ? { b: u, h: 10 * u } : { b: 10 * u, h: u };
		default:
			return { b: 10 * u, h: 10 * u };
	}
}

// ---------------------------------------------------------------------------------------------
// Geordnete Darstellung in der Stellenwerttafel: eine Spalte je Stelle, Material liegt unten.
// Einer in Zehnertürmen, Zehnerstangen in Zehnerreihen, Hunderter/Tausender in Zehnerstapeln.
// So bleibt jede Zehnergruppe als Gruppe sichtbar.
// ---------------------------------------------------------------------------------------------

const TURM_ABSTAND = 1.5; // Einer: Abstand der Türme (Mitte zu Mitte), in u
const STANGEN_ABSTAND = 1.5; // Zehner: Abstand der Stangen, in u
const REIHEN_ABSTAND = 1; // Zehner: Lücke zwischen Zehnerreihen, in u
const STAPEL_VERSATZ_X = 0.6; // Hunderter/Tausender: Versatz im Stapel, in u
const STAPEL_VERSATZ_Y = 1;
const STAPEL_ABSTAND = 1;

/**
 * Relative Rahmen der Teile einer Spalte, Ursprung links oben des Inhalts, plus Inhaltsgröße.
 * Zehnergruppen (Einertürme, Stangenreihen) stehen nebeneinander, solange `maxB` reicht, und
 * brechen dann in weitere Reihen um. Die erste Gruppe liegt unten links.
 */
function spaltenInhalt(
	art: Stelle,
	anzahl: number,
	u: number,
	maxB: number
): { teile: Rahmen[]; b: number; h: number } {
	const teile: Rahmen[] = [];
	if (anzahl === 0) return { teile, b: 0, h: 0 };

	if (art === 'E' || art === 'Z') {
		// Einer: Gruppe = Turm aus zehn Würfeln. Zehner: Gruppe = Reihe aus zehn Stangen.
		const gruppen = Math.ceil(anzahl / 10);
		const gruppeB = art === 'E' ? u : 9 * STANGEN_ABSTAND * u + u;
		const gruppeH = art === 'E' ? Math.min(anzahl, 10) * u : 10 * u;
		const luecke = (art === 'E' ? TURM_ABSTAND - 1 : STANGEN_ABSTAND) * u;
		const proReihe = Math.max(1, Math.floor((maxB + luecke) / (gruppeB + luecke)));
		const reihen = Math.ceil(gruppen / proReihe);
		const hoehe = reihen * gruppeH + (reihen - 1) * REIHEN_ABSTAND * u;
		const breiteGenutzt = Math.min(gruppen, proReihe);
		for (let i = 0; i < anzahl; i++) {
			const g = Math.floor(i / 10);
			const k = i % 10;
			const gx = (g % proReihe) * (gruppeB + luecke);
			const gy =
				hoehe -
				(Math.floor(g / proReihe) + 1) * gruppeH -
				Math.floor(g / proReihe) * REIHEN_ABSTAND * u;
			teile.push(
				art === 'E'
					? { x: gx, y: gy + gruppeH - (k + 1) * u, b: u, h: u }
					: { x: gx + k * STANGEN_ABSTAND * u, y: gy, b: u, h: 10 * u }
			);
		}
		const letzteB =
			art === 'E' || gruppen > 1 ? gruppeB : (Math.min(anzahl, 10) - 1) * STANGEN_ABSTAND * u + u;
		return {
			teile,
			b: breiteGenutzt > 1 ? breiteGenutzt * gruppeB + (breiteGenutzt - 1) * luecke : letzteB,
			h: hoehe
		};
	}

	// Hunderter und Tausender: Stapel zu je zehn, nebeneinander
	const stapel = Math.ceil(anzahl / 10);
	const inGroesstem = Math.min(anzahl, 10);
	const stapelB = 10 * u + (inGroesstem - 1) * STAPEL_VERSATZ_X * u;
	const hoehe = 10 * u + (inGroesstem - 1) * STAPEL_VERSATZ_Y * u;
	for (let i = 0; i < anzahl; i++) {
		const s = Math.floor(i / 10);
		const k = i % 10;
		teile.push({
			x: s * (stapelB + STAPEL_ABSTAND * u) + k * STAPEL_VERSATZ_X * u,
			y: hoehe - 10 * u - k * STAPEL_VERSATZ_Y * u,
			b: 10 * u,
			h: 10 * u
		});
	}
	return { teile, b: stapel * stapelB + (stapel - 1) * STAPEL_ABSTAND * u, h: hoehe };
}

export interface SpaltenRahmen {
	stelle: Stelle;
	x: number;
	breite: number;
}

export interface TafelLayout {
	u: number;
	spalten: SpaltenRahmen[];
	/** Unterkante des Materials in jeder Spalte */
	boden: number;
	positionen: Partial<Record<Stelle, Rahmen[]>>;
}

export const KOPF_HOEHE = 32;
export const ZIFFERN_HOEHE = 48;
const RAND = 6;
const U_MAX = 12;
const U_MIN = 1.5;

/**
 * Verteilt die Teile auf gleich breite Spalten und wählt die größte Einheit u, bei der alles passt.
 * `hoehe` ist die ganze Tafel inklusive Kopfzeile und optionaler Ziffernzeile.
 */
export function layoutTafel(
	anzahlen: Partial<Record<Stelle, number>>,
	spalten: readonly Stelle[],
	breite: number,
	hoehe: number,
	mitZiffernzeile = false
): TafelLayout {
	const spaltenBreite = breite / spalten.length;
	const boden = hoehe - (mitZiffernzeile ? ZIFFERN_HOEHE : 0) - RAND;
	const platzHoehe = boden - KOPF_HOEHE - RAND;
	const rahmen = spalten.map((stelle, i) => ({
		stelle,
		x: i * spaltenBreite,
		breite: spaltenBreite
	}));

	let u = U_MAX;
	for (; u > U_MIN; u -= 0.25) {
		const passt = spalten.every((s) => {
			const inhalt = spaltenInhalt(s, anzahlen[s] ?? 0, u, spaltenBreite - 2 * RAND);
			return inhalt.b <= spaltenBreite - 2 * RAND && inhalt.h <= platzHoehe;
		});
		if (passt) break;
	}

	const positionen: TafelLayout['positionen'] = {};
	for (const r of rahmen) {
		const inhalt = spaltenInhalt(r.stelle, anzahlen[r.stelle] ?? 0, u, r.breite - 2 * RAND);
		const x0 = r.x + (r.breite - inhalt.b) / 2;
		const y0 = boden - inhalt.h;
		positionen[r.stelle] = inhalt.teile.map((t) => ({ ...t, x: x0 + t.x, y: y0 + t.y }));
	}
	return { u, spalten: rahmen, boden, positionen };
}

// ---------------------------------------------------------------------------------------------
// Ungeordnete Darstellung zum Bündeln: liegende Zehnerstangen oben in zwei Spalten, lose Würfel
// darunter auf einem Raster mit Zellen von mindestens 44 px, damit jeder Würfel antippbar bleibt.
// ---------------------------------------------------------------------------------------------

export interface StreuLayout {
	u: number;
	/** Plätze für bis zu zehn Stangen, der Reihe nach belegt */
	stangenPlaetze: Rahmen[];
	/** Zellen für Würfel in der Reihenfolge ihrer Belegung (vom Seed gemischt) */
	wuerfelPlaetze: Rahmen[];
	/** Kantenlänge der Tipp-Zelle um jeden Würfel */
	zelle: number;
}

export function layoutStreu(breite: number, hoehe: number, seed: number): StreuLayout {
	const rng = new Rng(seed);
	const u = Math.min(16, (breite - 3 * RAND) / 20.5);
	const stangenPlaetze: Rahmen[] = [];
	const spaltenAbstand = breite - 2 * RAND - 20 * u;
	for (let i = 0; i < 10; i++) {
		stangenPlaetze.push({
			x: RAND + (i % 2) * (10 * u + spaltenAbstand),
			y: RAND + Math.floor(i / 2) * (u + 8),
			b: 10 * u,
			h: u
		});
	}
	const obenBelegt = RAND + 5 * (u + 8) + 4;

	// größte Zelle zwischen 44 und 28 px, bei der mindestens 30 Würfel Platz haben
	let zelle = 48;
	let spalten = 0;
	let zeilen = 0;
	for (; zelle >= 28; zelle -= 2) {
		spalten = Math.floor((breite - 2 * RAND) / zelle);
		zeilen = Math.floor((hoehe - obenBelegt - RAND) / zelle);
		if (spalten * zeilen >= 30) break;
	}
	const randX = (breite - spalten * zelle) / 2;
	const wuerfelPlaetze: Rahmen[] = [];
	const spiel = (zelle - u) * 0.3;
	for (let z = 0; z < zeilen; z++) {
		for (let s = 0; s < spalten; s++) {
			wuerfelPlaetze.push({
				x: randX + s * zelle + (zelle - u) / 2 + (rng.next() * 2 - 1) * spiel,
				y: obenBelegt + z * zelle + (zelle - u) / 2 + (rng.next() * 2 - 1) * spiel,
				b: u,
				h: u
			});
		}
	}
	// Fisher-Yates mit Seed: Würfel liegen durcheinander, aber bei gleichem Seed gleich
	for (let i = wuerfelPlaetze.length - 1; i > 0; i--) {
		const j = Math.floor(rng.next() * (i + 1));
		[wuerfelPlaetze[i], wuerfelPlaetze[j]] = [wuerfelPlaetze[j], wuerfelPlaetze[i]];
	}
	return { u, stangenPlaetze, wuerfelPlaetze, zelle };
}
