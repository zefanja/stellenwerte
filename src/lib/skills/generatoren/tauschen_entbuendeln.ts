import { RICHTIG, falsch } from '../bewertung';
import {
	STELLEN,
	gleichesMaterial,
	istGueltigesMaterial,
	normiert,
	wert,
	ziffer
} from '../material';
import { Rng } from '../rng';
import type { Distraktor, Generator, Item, Material } from '../typen';
import type { Bereich } from '../zufall';

export interface Params {
	zahl: Bereich;
	abzug: Bereich;
}

const reichtFuer = (m: Material, abzug: number) =>
	STELLEN.every((s) => (m[s] ?? 0) >= ziffer(abzug, s));

/**
 * Tauscht wie beim schriftlichen Abziehen von den Einern aufwärts jeweils ein Bündel der
 * nächsthöheren Stelle in zehn Teile, bis jede Spalte für die Wegnahme reicht. Liefert
 * den Endzustand und die Einzelschritte (Index der entbündelten Spalte) in Ausführungsreihenfolge.
 */
function minimalerTausch(zahl: number, abzug: number) {
	const m: Material = { T: 0, H: 0, Z: 0, E: 0, ...normiert(zahl) };
	const schritte: number[] = [];
	const entbuendle = (i: number) => {
		if (i < 0) throw new Error('Abzug größer als Zahl');
		if (m[STELLEN[i]]! === 0) entbuendle(i - 1);
		m[STELLEN[i]]! -= 1;
		m[STELLEN[i + 1]]! += 10;
		schritte.push(i);
	};
	for (let i = STELLEN.length - 1; i >= 0; i--) {
		while (m[STELLEN[i]]! < ziffer(abzug, STELLEN[i])) entbuendle(i - 1);
	}
	return { material: kuerzen(m), schritte };
}

/** Führende leere Spalten entfernen, damit die Darstellung zur Zahl passt */
function kuerzen(m: Material): Material {
	const out: Material = {};
	let begonnen = false;
	for (const s of STELLEN) {
		if ((m[s] ?? 0) > 0 || begonnen || s === 'E') {
			out[s] = m[s] ?? 0;
			begonnen = true;
		}
	}
	return out;
}

export function baue(zahl: number, abzug: number, seed: number, params: Params): Item<Params> {
	const start = normiert(zahl);
	const { material: loesung, schritte } = minimalerTausch(zahl, abzug);

	const distraktoren: Distraktor[] = [
		{ antwort: { typ: 'material', material: start }, error_tag: 'kein_entbuendeln' }
	];
	if (schritte.length >= 2) {
		// nur den ersten Tausch ausgeführt, z. B. bei 403 − 5 nur Hunderter in Zehner
		const m: Material = { T: 0, H: 0, Z: 0, E: 0, ...start };
		m[STELLEN[schritte[0]]]! -= 1;
		m[STELLEN[schritte[0] + 1]]! += 10;
		if (!reichtFuer(m, abzug)) {
			distraktoren.push({
				antwort: { typ: 'material', material: kuerzen(m) },
				error_tag: 'entbuendeln_unvollstaendig'
			});
		}
	}
	// Bündel weggenommen, aber keine zehn Teile dafür hingelegt
	const verloren: Material = { T: 0, H: 0, Z: 0, E: 0, ...start };
	verloren[STELLEN[schritte[0]]]! -= 1;
	distraktoren.push({
		antwort: { typ: 'material', material: kuerzen(verloren) },
		error_tag: 'wert_veraendert'
	});

	return {
		skillId: 'tauschen_entbuendeln',
		seed,
		params,
		prompt: 'Was musst du tauschen?',
		darstellung: { typ: 'wegnahme', zahl, abzug, material: start },
		loesung: { typ: 'material', material: loesung },
		distraktoren,
		error_tags: ['kein_entbuendeln', 'entbuendeln_unvollstaendig', 'wert_veraendert', 'sonstiges']
	};
}

export const tauschen_entbuendeln: Generator<Params> = {
	defaults: { zahl: [21, 99], abzug: [2, 9] },

	generate(params, seed) {
		const rng = new Rng(seed);
		for (let versuch = 0; versuch < 1000; versuch++) {
			const zahl = rng.int(params.zahl[0], Math.min(params.zahl[1], 9999));
			const abzug = rng.int(params.abzug[0], Math.min(params.abzug[1], zahl - 1));
			if (abzug < params.abzug[0]) continue;
			if (!reichtFuer(normiert(zahl), abzug)) return baue(zahl, abzug, seed, params);
		}
		throw new RangeError('keine Aufgabe mit Tausch in diesen Grenzen');
	},

	bewerte(item, antwort) {
		if (item.darstellung.typ !== 'wegnahme') throw new Error('falsche Darstellung');
		if (antwort.typ !== 'material' || !istGueltigesMaterial(antwort.material))
			return falsch('sonstiges');
		const { zahl, abzug } = item.darstellung;
		if (wert(antwort.material) !== zahl) return falsch('wert_veraendert');
		if (reichtFuer(antwort.material, abzug)) return RICHTIG;
		if (gleichesMaterial(antwort.material, normiert(zahl))) return falsch('kein_entbuendeln');
		return falsch('entbuendeln_unvollstaendig');
	}
};
