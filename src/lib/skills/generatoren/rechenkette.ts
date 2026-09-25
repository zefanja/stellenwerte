import { falsch, gleich, RICHTIG } from '../bewertung';
import { Rng } from '../rng';
import { isoliert, ohneUebertrag } from '../stellen';
import type { Distraktor, Generator, Item, Operation } from '../typen';
import type { Bereich } from '../zufall';

export interface Params {
	start: Bereich;
	schritte: number[];
	/** Anzahl der Lücken zwischen Start und Ziel */
	laenge: Bereich;
	/** true: in den Lücken springt eine höhere Stelle mit (370, 380, 390, 400) */
	mit_uebergang: boolean;
	operationen: Operation[];
}

const MAX = 9999;
const schrittVon = (v: number, op: Operation, s: number) => (op === '+' ? v + s : v - s);
const springt = (a: number, b: number, s: number) =>
	Math.floor(a / (s * 10)) !== Math.floor(b / (s * 10));

export function baue(
	start: number,
	op: Operation,
	schritt: number,
	laenge: number,
	seed: number,
	params: Params
): Item<Params> {
	const werte = Array.from({ length: laenge }, (_, i) => schrittVon(start, op, (i + 1) * schritt));
	const ziel = schrittVon(start, op, (laenge + 1) * schritt);
	const vorher = (i: number) => (i === 0 ? start : werte[i - 1]);
	const mitFehler = (i: number, wert: number) => werte.map((w, j) => (j === i ? wert : w));
	const kette = (ws: number[]) => ({ typ: 'kette' as const, werte: ws });

	const kandidaten: [Distraktor['error_tag'], number[] | undefined][] = [];
	const sprung = werte.findIndex((w, i) => springt(vorher(i), w, schritt));
	if (sprung >= 0) {
		kandidaten.push(['stelle_isoliert', mitFehler(sprung, isoliert(vorher(sprung), schritt, op))]);
		if (op === '+')
			kandidaten.push([
				'uebertrag_vergessen',
				mitFehler(sprung, ohneUebertrag(vorher(sprung), schritt))
			]);
	}
	kandidaten.push(['zaehlfehler_eins', werte.map((w) => w + 1)]);
	const zehnfach = werte.map((_, i) => schrittVon(start, op, (i + 1) * schritt * 10));
	kandidaten.push(['falsche_stelle', zehnfach.every((w) => w >= 0) ? zehnfach : undefined]);

	const gesehen = new Set([werte.join(',')]);
	const distraktoren: Distraktor[] = [];
	for (const [error_tag, ws] of kandidaten) {
		if (!ws || gesehen.has(ws.join(','))) continue;
		gesehen.add(ws.join(','));
		distraktoren.push({ antwort: kette(ws), error_tag });
	}

	return {
		skillId: 'rechenkette',
		seed,
		params,
		prompt: 'Rechne immer weiter bis zum Ziel.',
		darstellung: { typ: 'kette', start, ziel, op, schritt, laenge },
		loesung: kette(werte),
		distraktoren,
		error_tags: [
			'stelle_isoliert',
			'uebertrag_vergessen',
			'falsche_stelle',
			'zaehlfehler_eins',
			'sonstiges'
		]
	};
}

export const rechenkette: Generator<Params> = {
	defaults: {
		start: [100, 9000],
		schritte: [1, 10, 100],
		laenge: [3, 5],
		mit_uebergang: true,
		operationen: ['+', '−']
	},

	generate(params, seed) {
		const rng = new Rng(seed);
		for (let versuch = 0; versuch < 2000; versuch++) {
			const schritt = rng.pick(params.schritte);
			const op = rng.pick(params.operationen);
			const laenge = rng.int(params.laenge[0], params.laenge[1]);
			let start = rng.int(params.start[0], params.start[1]);
			if (params.mit_uebergang) {
				// Übergang bei der k-ten Lücke: Ziffer davor auf 9 (plus) bzw. 0 (minus) bringen
				const k = rng.int(1, laenge);
				const d = op === '+' ? 9 - (k - 1) : k - 1;
				start += (d - (Math.floor(start / schritt) % 10)) * schritt;
				if (rng.chance(0.5))
					start +=
						((op === '+' ? 9 : 0) - (Math.floor(start / (schritt * 10)) % 10)) * schritt * 10;
			}
			const alle = Array.from({ length: laenge + 2 }, (_, i) => schrittVon(start, op, i * schritt));
			if (alle.some((w) => w < 0 || w > MAX) || start < params.start[0] || start > params.start[1])
				continue;
			const luecken = alle.slice(0, laenge + 1);
			const mitSprung = luecken.some((w, i) => i > 0 && springt(luecken[i - 1], w, schritt));
			if (mitSprung !== params.mit_uebergang) continue;
			return baue(start, op, schritt, laenge, seed, params);
		}
		throw new RangeError('keine Kette in diesen Grenzen');
	},

	/** Eingeordnet wird der erste falsche Schritt, bezogen auf den richtigen Wert davor. */
	bewerte(item, antwort) {
		if (item.darstellung.typ !== 'kette' || item.loesung.typ !== 'kette')
			throw new Error('falsche Darstellung');
		const { start, op, schritt } = item.darstellung;
		const soll = item.loesung.werte;
		if (
			antwort.typ !== 'kette' ||
			antwort.werte.length !== soll.length ||
			!antwort.werte.every(Number.isFinite)
		) {
			return falsch('sonstiges');
		}
		const i = antwort.werte.findIndex((g, j) => !gleich(g, soll[j]));
		if (i < 0) return RICHTIG;
		const g = antwort.werte[i];
		const vorher = i === 0 ? start : soll[i - 1];
		if (g === isoliert(vorher, schritt, op)) return falsch('stelle_isoliert');
		if (op === '+' && g === ohneUebertrag(vorher, schritt)) return falsch('uebertrag_vergessen');
		if (
			g === schrittVon(vorher, op, schritt * 10) ||
			(schritt >= 10 && g === schrittVon(vorher, op, schritt / 10))
		) {
			return falsch('falsche_stelle');
		}
		if (Math.abs(g - soll[i]) === 1) return falsch('zaehlfehler_eins');
		return falsch('sonstiges');
	}
};
