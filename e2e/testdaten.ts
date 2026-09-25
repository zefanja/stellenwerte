/** Feste Testdaten, von seed.ts angelegt und in den Tests verwendet */
export const SCHUELER = { label: 'Testkind 01', code: '314159' };
/** Neuer Schüler für den Offline-Test */
export const SCHUELER_OFFLINE = { label: 'Testkind 03', code: '161803' };

/** Hat alle Skills der Wochen 4–5 fällig (älteste zuerst), dazu einen stabilen Skill zum Aufwärmen */
export const SCHUELER_WOCHE45 = {
	label: 'Testkind 02',
	code: '271828',
	faellig: ['stelle_veraendern', 'rechenkette', 'zahlenstrahl', 'zahlen_vergleichen']
};
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
