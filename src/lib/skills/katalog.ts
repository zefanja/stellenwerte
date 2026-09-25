import type { EingabeTyp, Generator } from './typen';
import { buendeln_100 } from './generatoren/buendeln_100';
import { tauschen_entbuendeln } from './generatoren/tauschen_entbuendeln';
import { material_zu_zahl } from './generatoren/material_zu_zahl';
import { zahl_zu_material } from './generatoren/zahl_zu_material';
import { zahlwort_ziffern } from './generatoren/zahlwort_ziffern';
import { nicht_normiert } from './generatoren/nicht_normiert';
import { buendel_zaehlen } from './generatoren/buendel_zaehlen';
import { buendel_umkehr } from './generatoren/buendel_umkehr';

export interface SkillDef {
	/** stabil, FSRS-Karten hängen daran */
	id: string;
	titel: string;
	woche: 1 | 2 | 3 | 4 | 5 | 6;
	beschreibung: string;
	/** null: Generator folgt in einem späteren Meilenstein, Skill wird nicht freigeschaltet */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	generator: Generator<any> | null;
	params_default: unknown;
	voraussetzungen: string[];
	eingabe_typ: EingabeTyp;
	/** Zielwert der Median-Antwortzeit für die FSRS-Bewertung (Easy darunter, Hard über dem Doppelten) */
	zielzeit_ms: number;
}

const skill = (d: Omit<SkillDef, 'params_default'>): SkillDef => ({
	...d,
	params_default: d.generator?.defaults ?? null
});

export const KATALOG: readonly SkillDef[] = [
	skill({
		id: 'buendeln_100',
		titel: 'Bündeln bis 100',
		woche: 1,
		beschreibung: 'Ungeordnete Menge bündeln, Anzahl bestimmen',
		generator: buendeln_100,
		voraussetzungen: [],
		eingabe_typ: 'material_buendeln',
		zielzeit_ms: 25_000
	}),
	skill({
		id: 'tauschen_entbuendeln',
		titel: 'Tauschen vor dem Wegnehmen',
		woche: 1,
		beschreibung: '„Was musst du tauschen?“ vor einer Wegnahme',
		generator: tauschen_entbuendeln,
		voraussetzungen: ['buendeln_100'],
		eingabe_typ: 'material_tauschen',
		zielzeit_ms: 15_000
	}),
	skill({
		id: 'material_zu_zahl',
		titel: 'Material als Zahl',
		woche: 2,
		beschreibung: 'Gelegtes Material als Zahl schreiben',
		generator: material_zu_zahl,
		voraussetzungen: ['buendeln_100'],
		eingabe_typ: 'ziffernblock',
		zielzeit_ms: 10_000
	}),
	skill({
		id: 'zahl_zu_material',
		titel: 'Zahl mit Material legen',
		woche: 2,
		beschreibung: 'Zahl mit Material aus dem Vorrat legen',
		generator: zahl_zu_material,
		voraussetzungen: ['material_zu_zahl'],
		eingabe_typ: 'material_legen',
		zielzeit_ms: 20_000
	}),
	skill({
		id: 'zahlwort_ziffern',
		titel: 'Zahlwort in Ziffern',
		woche: 2,
		beschreibung: 'Gesprochenes oder geschriebenes Zahlwort in Ziffern',
		generator: zahlwort_ziffern,
		voraussetzungen: ['material_zu_zahl'],
		eingabe_typ: 'ziffernblock',
		zielzeit_ms: 10_000
	}),
	skill({
		id: 'nicht_normiert',
		titel: 'Nicht normierte Stellen',
		woche: 2,
		beschreibung: '„4 H 13 Z 2 E ist welche Zahl?“',
		generator: nicht_normiert,
		voraussetzungen: ['buendeln_100', 'material_zu_zahl'],
		eingabe_typ: 'ziffernblock',
		zielzeit_ms: 12_000
	}),
	skill({
		id: 'buendel_zaehlen',
		titel: 'Bündel zählen',
		woche: 3,
		beschreibung: '„Wie viele Zehner stecken in 340?“',
		generator: buendel_zaehlen,
		voraussetzungen: ['material_zu_zahl', 'tauschen_entbuendeln'],
		eingabe_typ: 'ziffernblock',
		zielzeit_ms: 10_000
	}),
	skill({
		id: 'buendel_umkehr',
		titel: 'Bündel als Zahl',
		woche: 3,
		beschreibung: '„34 Zehner sind welche Zahl?“',
		generator: buendel_umkehr,
		voraussetzungen: ['buendel_zaehlen'],
		eingabe_typ: 'ziffernblock',
		zielzeit_ms: 10_000
	}),
	skill({
		id: 'stelle_veraendern',
		titel: 'Stelle verändern',
		woche: 4,
		beschreibung: '4 090 + 10, 1 000 − 1',
		generator: null,
		voraussetzungen: ['nicht_normiert', 'zahl_zu_material'],
		eingabe_typ: 'ziffernblock',
		zielzeit_ms: 10_000
	}),
	skill({
		id: 'rechenkette',
		titel: 'Rechenkette',
		woche: 4,
		beschreibung: 'Kette in gleichen Schritten bis zur Zielzahl',
		generator: null,
		voraussetzungen: ['stelle_veraendern'],
		eingabe_typ: 'ziffernblock_kette',
		zielzeit_ms: 30_000
	}),
	skill({
		id: 'zahlenstrahl',
		titel: 'Zahlenstrahl',
		woche: 5,
		beschreibung: 'Zahl auf leerem Strahl verorten, und umgekehrt',
		generator: null,
		voraussetzungen: ['zahlwort_ziffern', 'buendel_zaehlen'],
		eingabe_typ: 'strahl_regler',
		zielzeit_ms: 12_000
	}),
	skill({
		id: 'zahlen_vergleichen',
		titel: 'Zahlen vergleichen',
		woche: 5,
		beschreibung: 'Größere Zahl wählen, Stelle begründen',
		generator: null,
		voraussetzungen: ['material_zu_zahl', 'zahlwort_ziffern'],
		eingabe_typ: 'auswahlkarten',
		zielzeit_ms: 8_000
	})
];

export const SKILLS: ReadonlyMap<string, SkillDef> = new Map(KATALOG.map((s) => [s.id, s]));
