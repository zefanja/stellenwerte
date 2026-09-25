import { falsch, RICHTIG, zahl } from '../bewertung';
import { Rng } from '../rng';
import type { Distraktor, Generator, Item } from '../typen';

export interface Params {
	intervalle: [number, number][];
	/** Toleranz als Anteil der Strahllänge in Prozent */
	toleranz_prozent: number;
	/** verorten: Zahl mit dem Regler setzen; ablesen: Zahl am Pfeil eintippen */
	modus: 'verorten' | 'ablesen' | 'zufall';
	/** 0 für ganze Zahlen; 1 oder 2 für Dezimalzahlen (Woche 6) */
	nachkommastellen: number;
}

/** Schrittweite des Reglers: ein Hundertstel der Länge, bei Dezimalzahlen die kleinste Stelle */
export function rasterFuer(von: number, bis: number, nachkommastellen: number): number {
	if (nachkommastellen > 0) return 10 ** -nachkommastellen;
	return Math.max(1, 10 ** (Math.floor(Math.log10(bis - von)) - 2));
}

/** k Raster-Einheiten als Zahl, ohne Rundungsfehler bei Dezimalzahlen */
export const ausEinheiten = (k: number, raster: number) =>
	raster < 1 ? k / Math.round(1 / raster) : k * raster;
export const aufRaster = (w: number, raster: number) =>
	ausEinheiten(Math.round(w / raster), raster);

function verwechslungen(n: number, von: number, bis: number, tol: number): number[] {
	return [n * 10, n / 10].filter((w) => w >= von && w <= bis && Math.abs(w - n) > 2 * tol);
}

export function baue(
	von: number,
	bis: number,
	n: number,
	modus: 'verorten' | 'ablesen',
	seed: number,
	params: Params
): Item<Params> {
	const raster = rasterFuer(von, bis, params.nachkommastellen);
	const tol = (params.toleranz_prozent / 100) * (bis - von);
	const distraktoren: Distraktor[] = [];
	const naheWeg = [n + 1.5 * tol, n - 1.5 * tol]
		.map((w) => aufRaster(w, raster))
		.find((w) => w > von && w < bis && Math.abs(w - n) > tol && Math.abs(w - n) <= 2 * tol);
	if (naheWeg !== undefined) distraktoren.push({ antwort: zahl(naheWeg), error_tag: 'ungenau' });
	const verwechselt = verwechslungen(n, von, bis, tol)[0];
	if (verwechselt !== undefined)
		distraktoren.push({
			antwort: zahl(aufRaster(verwechselt, raster)),
			error_tag: 'falsche_stelle'
		});

	return {
		skillId: 'zahlenstrahl',
		seed,
		params,
		prompt: modus === 'verorten' ? 'Wo liegt die Zahl?' : 'Welche Zahl zeigt der Pfeil?',
		darstellung: { typ: 'strahl', von, bis, modus, zahl: n, raster },
		loesung: zahl(n),
		distraktoren,
		error_tags: ['ungenau', 'falsche_stelle', 'sonstiges']
	};
}

export const zahlenstrahl: Generator<Params> = {
	defaults: {
		intervalle: [
			[0, 100],
			[0, 1000],
			[0, 10000]
		],
		toleranz_prozent: 5,
		modus: 'zufall',
		nachkommastellen: 0
	},

	generate(params, seed) {
		const rng = new Rng(seed);
		const [von, bis] = rng.pick(params.intervalle);
		const modus =
			params.modus === 'zufall' ? rng.pick(['verorten', 'ablesen'] as const) : params.modus;
		const raster = rasterFuer(von, bis, params.nachkommastellen);
		const a = Math.round(von / raster);
		const b = Math.round(bis / raster);
		// mit Abstand zu den Enden, sonst ist es kein Schätzen mehr
		const k = rng.int(Math.floor(a + 0.05 * (b - a)) + 1, Math.ceil(b - 0.05 * (b - a)) - 1);
		return baue(von, bis, ausEinheiten(k, raster), modus, seed, params);
	},

	/** Richtig innerhalb der Toleranz; Zehnerverwechslung; bis zur doppelten Toleranz „ungefähr“. */
	bewerte(item, antwort) {
		if (item.darstellung.typ !== 'strahl') throw new Error('falsche Darstellung');
		if (antwort.typ !== 'zahl' || !Number.isFinite(antwort.wert)) return falsch('sonstiges');
		const { von, bis, zahl: n } = item.darstellung;
		const tol = (item.params.toleranz_prozent / 100) * (bis - von) + 1e-9;
		const abstand = Math.abs(antwort.wert - n);
		if (abstand <= tol) return RICHTIG;
		if (verwechslungen(n, von, bis, tol).some((w) => Math.abs(antwort.wert - w) <= tol))
			return falsch('falsche_stelle');
		if (abstand <= 2 * tol) return falsch('ungenau');
		return falsch('sonstiges');
	}
};
