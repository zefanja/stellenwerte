import { falsch, RICHTIG } from '../bewertung';
import { Rng } from '../rng';
import { EXPONENT, nachkommastellen, stelleMitExponent, zifferAn } from '../stellen';
import type { Distraktor, Generator, Item, StellenName } from '../typen';
import type { Bereich } from '../zufall';

export interface Params {
	/** Anzahl der Stellen vor dem Komma */
	stellen: Bereich;
	/** true: beide Zahlen bestehen aus denselben Ziffern (nur ganze Zahlen) */
	gleiche_ziffern: boolean;
	/** [0, 0] für ganze Zahlen; z. B. [1, 2] für Dezimalzahlen (Woche 6) */
	nachkommastellen: Bereich;
}

const vorKomma = (n: number) => String(Math.trunc(n)).length;

/** Stellen von der höchsten bis zur kleinsten, die in einer der beiden Zahlen vorkommen */
export function stellenVon(a: number, b: number): StellenName[] {
	const oben = Math.max(vorKomma(a), vorKomma(b)) - 1;
	const unten = -Math.max(nachkommastellen(a), nachkommastellen(b));
	const liste: StellenName[] = [];
	for (let e = oben; e >= unten; e--) liste.push(stelleMitExponent(e)!);
	return liste;
}

/** Die erste Stelle von links (nach Stellenwert ausgerichtet), an der sich die Zahlen unterscheiden */
export function entscheidendeStelle(a: number, b: number): StellenName {
	return stellenVon(a, b).find((s) => zifferAn(a, EXPONENT[s]) !== zifferAn(b, EXPONENT[s]))!;
}

/**
 * Welche Zahl wählt, wer Ziffern statt Stellenwerte vergleicht? Ganze Zahlen: von links Ziffer für
 * Ziffer ohne Ausrichtung (899 > 1 002). Dezimalzahlen: die Nachkommastellen als ganze Zahl (2,13 > 2,7).
 */
export function naiveWahl(a: number, b: number): 0 | 1 {
	if (Number.isInteger(a) && Number.isInteger(b)) return String(a) > String(b) ? 0 : 1;
	if (Math.trunc(a) !== Math.trunc(b)) return Math.trunc(a) > Math.trunc(b) ? 0 : 1;
	const nach = (n: number) => Number(String(n).split('.')[1] ?? '0');
	return nach(a) > nach(b) ? 0 : 1;
}

export function baue(a: number, b: number, seed: number, params: Params): Item<Params> {
	const rng = new Rng(seed ^ 0x5eed);
	const groessere: 0 | 1 = a > b ? 0 : 1;
	const stelle = entscheidendeStelle(a, b);
	// zwei bis vier Stellen zur Auswahl, darunter die entscheidende
	const alle = stellenVon(a, b);
	const i = alle.indexOf(stelle);
	const anfang = Math.max(0, Math.min(i - rng.int(0, 3), alle.length - 4));
	const stellen = alle.slice(anfang, anfang + 4);

	const distraktoren: Distraktor[] = [];
	const naiv = naiveWahl(a, b);
	if (naiv !== groessere)
		distraktoren.push({
			antwort: { typ: 'vergleich', groessere: naiv, stelle },
			error_tag: 'ziffernvergleich'
		});
	const andere = stellen.filter((s) => s !== stelle);
	if (andere.length > 0)
		distraktoren.push({
			antwort: { typ: 'vergleich', groessere, stelle: rng.pick(andere) },
			error_tag: 'stelle_falsch_begruendet'
		});

	return {
		skillId: 'zahlen_vergleichen',
		seed,
		params,
		prompt: 'Welche Zahl ist größer?',
		darstellung: { typ: 'vergleich', zahlen: [a, b], stellen },
		loesung: { typ: 'vergleich', groessere, stelle },
		distraktoren,
		error_tags: ['ziffernvergleich', 'stelle_falsch_begruendet', 'sonstiges']
	};
}

function ziffern(rng: Rng, laenge: number, fuehrendeNull = false): string {
	let s = String(fuehrendeNull ? rng.int(0, 9) : rng.int(1, 9));
	for (let i = 1; i < laenge; i++) s += rng.int(0, 9);
	return s;
}

export const zahlen_vergleichen: Generator<Params> = {
	defaults: { stellen: [3, 4], gleiche_ziffern: false, nachkommastellen: [0, 0] },

	generate(params, seed) {
		const rng = new Rng(seed);
		for (let versuch = 0; versuch < 2000; versuch++) {
			let a: number;
			let b: number;
			const nk = params.nachkommastellen;
			if (nk[1] > 0) {
				// gleicher ganzer Teil, verschieden lange Nachkommastellen; oft so, dass Ziffernvergleich täuscht (2,7 / 2,13)
				const ganz = Number(ziffern(rng, rng.int(params.stellen[0], params.stellen[1]), true));
				const la = rng.int(nk[0], nk[1]);
				const lb = rng.int(nk[0], nk[1]);
				let fa = ziffern(rng, la, true);
				let fb = ziffern(rng, lb, true);
				if (la < lb && rng.chance(0.6)) fb = String(rng.int(0, Number(fa[0]))) + fb.slice(1);
				fa = fa.replace(/0+$/, '');
				fb = fb.replace(/0+$/, '');
				if (!fa || !fb) continue;
				a = Number(`${ganz}.${fa}`);
				b = Number(`${ganz}.${fb}`);
			} else if (params.gleiche_ziffern) {
				const s = ziffern(rng, rng.int(params.stellen[0], params.stellen[1]));
				const t = [...s].sort(() => rng.next() - 0.5).join('');
				if (t[0] === '0') continue;
				a = Number(s);
				b = Number(t);
			} else {
				const la = rng.int(params.stellen[0], params.stellen[1]);
				const lb = rng.int(params.stellen[0], params.stellen[1]);
				let sa = ziffern(rng, la);
				const sb = ziffern(rng, lb);
				// bei ungleicher Länge oft die kürzere mit der größeren ersten Ziffer (899 / 1 002)
				if (la < lb && rng.chance(0.6))
					sa = String(rng.int(Number(sb[0]) + 1, 9) || 9) + sa.slice(1);
				a = Number(sa);
				b = Number(sb);
			}
			if (a === b || !Number.isFinite(a) || !Number.isFinite(b)) continue;
			return rng.chance(0.5) ? baue(a, b, seed, params) : baue(b, a, seed, params);
		}
		throw new RangeError('keine Vergleichsaufgabe in diesen Grenzen');
	},

	bewerte(item, antwort) {
		if (item.darstellung.typ !== 'vergleich' || item.loesung.typ !== 'vergleich')
			throw new Error('falsche Darstellung');
		if (antwort.typ !== 'vergleich' || (antwort.groessere !== 0 && antwort.groessere !== 1))
			return falsch('sonstiges');
		const [a, b] = item.darstellung.zahlen;
		if (antwort.groessere === item.loesung.groessere) {
			return antwort.stelle === item.loesung.stelle ? RICHTIG : falsch('stelle_falsch_begruendet');
		}
		return antwort.groessere === naiveWahl(a, b) ? falsch('ziffernvergleich') : falsch('sonstiges');
	}
};
