import type { ErrorTag } from './fehler';

/** Spalten der Stellenwerttafel, von groß nach klein. Dezimalstellen folgen in Woche 6. */
export type Stelle = 'T' | 'H' | 'Z' | 'E';

/** Anzahl der Material-Teile je Spalte. Werte über 9 sind erlaubt (nicht normiert). */
export type Material = Partial<Record<Stelle, number>>;

export type Darstellung =
	/** Material zum Zählen oder Ablesen */
	| { typ: 'material'; material: Material; anordnung: 'geordnet' | 'ungeordnet' }
	/** Zahl in Ziffern, die mit Material gelegt werden soll */
	| { typ: 'zahl'; zahl: number }
	/** Zahlwort, wird angezeigt und kann vorgelesen werden */
	| { typ: 'zahlwort'; wort: string }
	/** Stellenschreibweise wie „4 H 13 Z 2 E“, nicht normiert */
	| { typ: 'stellen'; material: Material }
	/** Material vor einer Wegnahme: „42 − 7, was musst du tauschen?“ */
	| { typ: 'wegnahme'; zahl: number; abzug: number; material: Material }
	/** „Wie viele Zehner stecken in 340?“ */
	| { typ: 'buendel'; zahl: number; stelle: Exclude<StellenName, 'E' | 'ZT' | 't'> }
	/** „34 Zehner sind welche Zahl?“ */
	| { typ: 'buendel_umkehr'; anzahl: number; stelle: Stelle }
	/** „4 090 + 10“ */
	| { typ: 'rechnung'; zahl: number; op: Operation; schritt: number }
	/** Kette von `start` bis `ziel` in gleichen Schritten; `laenge` Lücken dazwischen */
	| { typ: 'kette'; start: number; ziel: number; op: Operation; schritt: number; laenge: number }
	/** Leerer Zahlenstrahl von `von` bis `bis`; `raster` ist die Schrittweite des Reglers */
	| {
			typ: 'strahl';
			von: number;
			bis: number;
			modus: 'verorten' | 'ablesen';
			zahl: number;
			raster: number;
	  }
	/** Zwei Zahlen vergleichen; `stellen` sind die angebotenen Begründungen (2–4) */
	| { typ: 'vergleich'; zahlen: [number, number]; stellen: StellenName[] };

export type Operation = '+' | '−';

/** Stellen einschließlich Dezimalstellen: Zehntausender … Einer, Zehntel, Hundertstel, Tausendstel */
export type StellenName = 'ZT' | 'T' | 'H' | 'Z' | 'E' | 'z' | 'h' | 't';

export type Antwort =
	| { typ: 'zahl'; wert: number }
	| { typ: 'material'; material: Material }
	/** Werte der Lücken einer Rechenkette, in Reihenfolge */
	| { typ: 'kette'; werte: number[] }
	/** Index der größeren Zahl und die Stelle, an der es sich entscheidet */
	| { typ: 'vergleich'; groessere: 0 | 1; stelle: StellenName };

export type EingabeTyp =
	| 'ziffernblock'
	| 'material_buendeln'
	| 'material_tauschen'
	| 'material_legen'
	| 'ziffernblock_kette'
	| 'strahl_regler'
	| 'auswahlkarten';

export interface Distraktor {
	antwort: Antwort;
	error_tag: ErrorTag;
}

export interface Item<P = unknown> {
	skillId: string;
	seed: number;
	params: P;
	/** Aufgabentext, höchstens acht Wörter */
	prompt: string;
	darstellung: Darstellung;
	loesung: Antwort;
	/** Erwartbare Fehlantworten, eindeutig und verschieden von der Lösung */
	distraktoren: Distraktor[];
	/** Alle Fehlertypen, die dieser Generator erkennen kann */
	error_tags: ErrorTag[];
}

export interface Bewertung {
	correct: boolean;
	error_tag: ErrorTag | null;
}

export interface Generator<P> {
	defaults: P;
	generate(params: P, seed: number): Item<P>;
	bewerte(item: Item<P>, antwort: Antwort): Bewertung;
}
