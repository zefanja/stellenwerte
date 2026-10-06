import { describe, expect, it } from 'vitest';
import { KOPF_HOEHE, layoutStreu, layoutTafel, streuMindesthoehe, type Rahmen } from './layout';
import type { Stelle } from '$lib/skills/typen';

const ueberlappen = (a: Rahmen, b: Rahmen) =>
	a.x < b.x + b.b - 0.01 &&
	b.x < a.x + a.b - 0.01 &&
	a.y < b.y + b.h - 0.01 &&
	b.y < a.y + a.h - 0.01;

describe('layoutTafel', () => {
	it.each<[Partial<Record<Stelle, number>>, Stelle[]]>([
		[{ H: 4, Z: 13, E: 2 }, ['H', 'Z', 'E']],
		[{ H: 0, Z: 99, E: 0 }, ['H', 'Z', 'E']],
		[{ Z: 3, E: 12 }, ['Z', 'E']],
		[{ T: 9, H: 19, Z: 9, E: 9 }, ['T', 'H', 'Z', 'E']],
		[{ H: 3, Z: 9, E: 13 }, ['H', 'Z', 'E']]
	])('alle Teile liegen in ihrer Spalte und unter dem Kopf: %o', (anzahlen, spalten) => {
		for (const [breite, hoehe] of [
			[360, 330],
			[320, 260]
		]) {
			const l = layoutTafel(anzahlen, spalten, breite, hoehe, true);
			for (const r of l.spalten) {
				const teile = l.positionen[r.stelle]!;
				expect(teile).toHaveLength(anzahlen[r.stelle] ?? 0);
				for (const t of teile) {
					expect(t.x).toBeGreaterThanOrEqual(r.x);
					expect(t.x + t.b).toBeLessThanOrEqual(r.x + r.breite + 0.01);
					expect(t.y).toBeGreaterThanOrEqual(KOPF_HOEHE);
					expect(t.y + t.h).toBeLessThanOrEqual(l.boden + 0.01);
				}
			}
		}
	});

	it('Würfel und Stangen überlappen nicht', () => {
		const l = layoutTafel({ Z: 34, E: 19 }, ['H', 'Z', 'E'], 360, 330);
		for (const s of ['Z', 'E'] as const) {
			const teile = l.positionen[s]!;
			for (let i = 0; i < teile.length; i++)
				for (let j = i + 1; j < teile.length; j++)
					expect(ueberlappen(teile[i], teile[j])).toBe(false);
		}
	});

	it('viele Zehner liegen in Zehnergruppen nebeneinander statt in einem schmalen Turm', () => {
		const l = layoutTafel({ Z: 85 }, ['H', 'Z', 'E'], 360, 330, true);
		const xs = new Set(l.positionen.Z!.map((t) => Math.round(t.x)));
		expect(xs.size).toBeGreaterThan(10);
		expect(l.u).toBeGreaterThanOrEqual(3.5);
	});

	it('wenig Material wird groß gezeichnet, viel Material kleiner', () => {
		const wenig = layoutTafel({ Z: 3, E: 4 }, ['H', 'Z', 'E'], 360, 330);
		const viel = layoutTafel({ Z: 99 }, ['H', 'Z', 'E'], 360, 330);
		expect(wenig.u).toBeGreaterThan(viel.u);
	});
});

describe('layoutStreu', () => {
	it('bietet 30 Würfelplätze mit Tippzellen ab 28 px, ohne Überlappung mit den Stangen', () => {
		const l = layoutStreu(360, 330, 7);
		expect(l.wuerfelPlaetze.length).toBeGreaterThanOrEqual(30);
		expect(l.zelle).toBeGreaterThanOrEqual(28);
		for (const w of l.wuerfelPlaetze.slice(0, 30)) {
			expect(w.x).toBeGreaterThanOrEqual(0);
			expect(w.x + w.b).toBeLessThanOrEqual(360);
			expect(w.y + w.h).toBeLessThanOrEqual(330);
			for (const s of l.stangenPlaetze) expect(ueberlappen(w, s)).toBe(false);
		}
	});

	it('reserviert nur so viele Stangenreihen, wie die Aufgabe braucht', () => {
		const wenig = layoutStreu(360, 330, 7, { stangen: 2, wuerfel: 23 });
		const viel = layoutStreu(360, 330, 7, { stangen: 10, wuerfel: 23 });
		expect(wenig.stangenPlaetze).toHaveLength(2);
		expect(viel.stangenPlaetze).toHaveLength(10);
		const oben = (l: typeof wenig) => Math.min(...l.wuerfelPlaetze.map((w) => w.y));
		expect(oben(wenig)).toBeLessThan(oben(viel));
	});

	it.each([
		[416, { stangen: 2, wuerfel: 23 }],
		[416, { stangen: 9, wuerfel: 99 }],
		[320, { stangen: 10, wuerfel: 45 }],
		[288, { stangen: 0, wuerfel: 9 }]
	])('bei Mindesthöhe hat jeder Würfel einen Platz im Feld: %i px, %o', (breite, bedarf) => {
		const hoehe = streuMindesthoehe(breite, bedarf);
		const l = layoutStreu(breite, hoehe, 5, bedarf);
		expect(l.wuerfelPlaetze.length).toBeGreaterThanOrEqual(Math.max(30, bedarf.wuerfel));
		expect(l.zelle).toBeGreaterThanOrEqual(28);
		for (const w of l.wuerfelPlaetze) {
			expect(w.y + w.h).toBeLessThanOrEqual(hoehe);
			for (const s of l.stangenPlaetze) expect(ueberlappen(w, s)).toBe(false);
		}
	});

	it('bleibt in einem zu niedrigen Feld ohne Plätze, statt negative Zeilen zu rechnen', () => {
		const l = layoutStreu(416, 100, 1);
		expect(l.wuerfelPlaetze).toHaveLength(0);
		expect(l.zelle).toBe(28);
	});

	it('ist bei gleichem Seed gleich', () => {
		expect(layoutStreu(360, 330, 3)).toEqual(layoutStreu(360, 330, 3));
		expect(layoutStreu(360, 330, 3)).not.toEqual(layoutStreu(360, 330, 4));
	});
});
