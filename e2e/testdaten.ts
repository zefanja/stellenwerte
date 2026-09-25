/** Feste Testdaten, von seed.ts angelegt und in den Tests verwendet */
export const SCHUELER = { label: 'Testkind 01', code: '314159' };
export const LEHRKRAFT = { email: 'e2e@schule.test', password: 'e2e-passwort-123' };

/**
 * Dashboard-Gruppe mit festen Kartenständen. Erwartete Farben je Schüler und Skill,
 * nicht genannte Skills sind grau.
 */
export const DASHBOARD = {
	gruppe: 'Dashboard-Gruppe',
	erwartet: {
		Anna: { buendeln_100: 'gruen', tauschen_entbuendeln: 'gelb', material_zu_zahl: 'rot' },
		Ben: { buendeln_100: 'gelb' },
		Cem: {},
		Dana: { buendeln_100: 'rot', material_zu_zahl: 'rot', tauschen_entbuendeln: 'gruen' }
	} as Record<string, Record<string, string>>
};
