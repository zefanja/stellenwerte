import { expect } from 'vitest';
import { antwortSchluessel } from './bewertung';
import { FEHLERTYPEN } from './fehler';
import type { Generator, Item } from './typen';

/**
 * Eigenschaften, die jeder Generator für jeden Seed erfüllen muss (Akzeptanzkriterium M3):
 * deterministisch, lösbar, eindeutig, Distraktoren korrekt klassifiziert, Prompt kurz.
 */
export function pruefeGenerator<P>(
	gen: Generator<P>,
	params: P,
	grenzen: (item: Item<P>) => void,
	anzahl = 200
) {
	for (let seed = 1; seed <= anzahl; seed++) {
		const item = gen.generate(params, seed);
		expect(gen.generate(params, seed), `deterministisch, Seed ${seed}`).toEqual(item);
		expect(item.seed).toBe(seed);
		expect(item.prompt.split(/\s+/).length, item.prompt).toBeLessThanOrEqual(8);

		expect(gen.bewerte(item, item.loesung), `Lösung richtig, Seed ${seed}`).toEqual({
			correct: true,
			error_tag: null
		});

		const schluessel = item.distraktoren.map((d) => antwortSchluessel(d.antwort));
		expect(new Set(schluessel).size, `Distraktoren verschieden, Seed ${seed}`).toBe(
			schluessel.length
		);
		expect(schluessel).not.toContain(antwortSchluessel(item.loesung));
		for (const d of item.distraktoren) {
			expect(d.error_tag in FEHLERTYPEN).toBe(true);
			expect(item.error_tags).toContain(d.error_tag);
			expect(gen.bewerte(item, d.antwort), `Distraktor ${JSON.stringify(d)}, Seed ${seed}`).toEqual(
				{
					correct: false,
					error_tag: d.error_tag
				}
			);
		}
		grenzen(item);
	}
}
