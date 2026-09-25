import { describe, expect, it } from 'vitest';
import { baue as nichtNormiert, nicht_normiert } from './generatoren/nicht_normiert';
import { baue as tauschen, tauschen_entbuendeln } from './generatoren/tauschen_entbuendeln';
import { antwortText, aufgabeText, zahlText } from './text';

describe('Texte fürs Dashboard', () => {
	it('beschreibt Aufgaben und Antworten in einer Zeile', () => {
		expect(aufgabeText(nichtNormiert({ H: 4, Z: 13, E: 2 }, 1, nicht_normiert.defaults))).toBe(
			'4 H 13 Z 2 E als Zahl'
		);
		expect(aufgabeText(tauschen(42, 7, 1, tauschen_entbuendeln.defaults))).toBe('42 − 7: tauschen');
		expect(antwortText({ typ: 'material', material: { Z: 3, E: 12 } })).toBe('3 Z 12 E');
		expect(antwortText({ typ: 'zahl', wert: 4132 })).toBe('4 132');
		expect(zahlText(999)).toBe('999');
	});
});
