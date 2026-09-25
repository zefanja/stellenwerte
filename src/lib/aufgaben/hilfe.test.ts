import { describe, expect, it } from 'vitest';
import { spaltenFuer } from './hilfe';

describe('spaltenFuer', () => {
	it.each([
		[{ H: 4, Z: 13, E: 2 }, undefined, ['H', 'Z', 'E']],
		[{ Z: 34 }, undefined, ['H', 'Z', 'E']],
		[{ Z: 3, E: 12 }, undefined, ['Z', 'E']],
		[{ E: 7 }, undefined, ['Z', 'E']],
		[{ H: 3, Z: 4, E: 0 }, undefined, ['H', 'Z', 'E']],
		[{ T: 2, H: 3 }, undefined, ['T', 'H', 'Z', 'E']],
		[{ H: 12, Z: 1 }, undefined, ['T', 'H', 'Z', 'E']],
		[{ E: 3 }, 'H', ['H', 'Z', 'E']]
	] as const)('%o → %o', (material, auch, erwartet) => {
		expect(spaltenFuer(material, auch)).toEqual(erwartet);
	});
});
