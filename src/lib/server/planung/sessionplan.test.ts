import { describe, expect, it } from 'vitest';
import { KATALOG } from '$lib/skills/katalog';
import { Rng } from '$lib/skills/rng';
import {
	antwortAufgaben,
	freischaltbar,
	planeSession,
	planeVerlaengerung,
	type Karte
} from './sessionplan';
import { plusTage, tagesbeginn, tagVon } from './zeit';

const jetzt = new Date('2026-10-12T14:00:00Z');
const heute = tagVon(jetzt);
const tag = (n: number) => tagesbeginn(plusTage(heute, n));
const karte = (skillId: string, k: Partial<Karte> = {}): Karte => ({
	skillId,
	state: 2,
	stability: 10,
	due: tag(5),
	introducedAt: tag(-20),
	...k
});
const plane = (karten: Karte[], bisWoche = 6) =>
	planeSession({ karten, jetzt, bisWoche, katalog: KATALOG, zufall: new Rng(1) });

describe('freischaltbar', () => {
	it('neuer Schüler beginnt mit dem ersten Skill ohne Voraussetzungen', () => {
		expect(freischaltbar({ karten: [], jetzt, bisWoche: 6, katalog: KATALOG })?.id).toBe(
			'buendeln_100'
		);
	});

	it('wartet, bis die Voraussetzung im Review mit Stabilität über drei Tagen ist', () => {
		const e = { jetzt, bisWoche: 6, katalog: KATALOG };
		expect(freischaltbar({ ...e, karten: [karte('buendeln_100', { stability: 2.3 })] })).toBeNull();
		expect(freischaltbar({ ...e, karten: [karte('buendeln_100', { stability: 3.5 })] })?.id).toBe(
			'tauschen_entbuendeln'
		);
	});

	it('höchstens ein neuer Skill pro Tag und nie zwei Einführungen gleichzeitig', () => {
		const e = { jetzt, bisWoche: 6, katalog: KATALOG };
		const heuteEingefuehrt = [
			karte('buendeln_100'),
			karte('tauschen_entbuendeln', { introducedAt: tag(0) })
		];
		expect(freischaltbar({ ...e, karten: heuteEingefuehrt })).toBeNull();
		const laufend = [
			karte('buendeln_100'),
			karte('tauschen_entbuendeln', { state: 0, introducedAt: tag(-3) })
		];
		expect(freischaltbar({ ...e, karten: laufend })).toBeNull();
	});

	it('respektiert die freigegebene Woche der Gruppe', () => {
		const karten = ['buendeln_100', 'tauschen_entbuendeln'].map((s) => karte(s));
		expect(freischaltbar({ karten, jetzt, bisWoche: 1, katalog: KATALOG })).toBeNull();
		expect(freischaltbar({ karten, jetzt, bisWoche: 2, katalog: KATALOG })?.id).toBe(
			'material_zu_zahl'
		);
	});
});

describe('planeSession', () => {
	it('erster Tag: Einführung des ersten Skills, zwei Beispiele, drei begleitete, eine Prüfrunde', () => {
		const p = plane([]);
		expect(p.einzufuehren).toBe('buendeln_100');
		expect(p.bloecke.map((b) => [b.art, b.anzahl])).toEqual([
			['beispiel', 2],
			['gefuehrt', 3],
			['pruefung', 5]
		]);
		expect(antwortAufgaben(p.bloecke)).toBe(8);
	});

	it('Aufwärmen, höchstens zwei fällige Karten nach Fälligkeit, Abschluss; nie mehr als 12 Aufgaben', () => {
		const karten = [
			karte('buendeln_100', { stability: 30 }),
			karte('tauschen_entbuendeln', { due: tag(-2) }),
			karte('material_zu_zahl', { due: tag(0) }),
			karte('zahl_zu_material', { due: tag(-5) })
		];
		const p = plane(karten);
		expect(p.bloecke.map((b) => [b.art, b.skillId])).toEqual([
			['aufwaermen', 'buendeln_100'],
			['wiederholung', 'zahl_zu_material'],
			['wiederholung', 'tauschen_entbuendeln'],
			['abschluss', 'buendeln_100']
		]);
		expect(antwortAufgaben(p.bloecke)).toBe(12);
	});

	it('Einführung nur, wenn sie noch Platz hat; eine laufende Einführung wird fortgesetzt', () => {
		const eine = [
			karte('buendeln_100', { stability: 5 }),
			karte('tauschen_entbuendeln', { due: tag(0) })
		];
		expect(plane(eine).bloecke.some((b) => b.art === 'pruefung')).toBe(false);

		const laufend = [
			karte('buendeln_100', { stability: 5 }),
			karte('tauschen_entbuendeln', { state: 0, introducedAt: tag(-1) })
		];
		const p = plane(laufend);
		expect(p.einzufuehren).toBeNull();
		expect(p.bloecke.filter((b) => b.art === 'pruefung').map((b) => b.skillId)).toEqual([
			'tauschen_entbuendeln'
		]);
		expect(antwortAufgaben(p.bloecke)).toBeLessThanOrEqual(12);
	});

	it('nichts fällig und nichts neu: freies Üben bis mindestens acht Aufgaben', () => {
		const karten = [karte('buendeln_100', { introducedAt: tag(0) })];
		const p = plane(karten);
		expect(p.einzufuehren).toBeNull();
		expect(antwortAufgaben(p.bloecke)).toBe(8);
		expect(p.bloecke.map((b) => b.art)).toEqual(['aufwaermen', 'uebung', 'abschluss']);
	});

	it('Skills jenseits der freigegebenen Woche werden nicht geplant', () => {
		const karten = [karte('buendeln_100'), karte('material_zu_zahl', { due: tag(-1) })];
		expect(plane(karten, 1).bloecke.some((b) => b.skillId === 'material_zu_zahl')).toBe(false);
	});
});

describe('planeVerlaengerung', () => {
	it('nimmt die nächste fällige Karte, die heute noch nicht dran war, sonst freies Üben', () => {
		const karten = [
			karte('buendeln_100', { due: tag(-1) }),
			karte('material_zu_zahl', { due: tag(0) })
		];
		const e = { karten, jetzt, bisWoche: 6, katalog: KATALOG, zufall: new Rng(1) };
		expect(planeVerlaengerung({ ...e, schonWiederholt: new Set(['buendeln_100']) })).toEqual([
			{ art: 'wiederholung', skillId: 'material_zu_zahl', anzahl: 5 }
		]);
		const frei = planeVerlaengerung({
			...e,
			schonWiederholt: new Set(['buendeln_100', 'material_zu_zahl'])
		});
		expect(frei[0].art).toBe('uebung');
	});
});
