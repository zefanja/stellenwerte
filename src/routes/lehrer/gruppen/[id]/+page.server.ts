import { gruppenUebersicht } from '$lib/server/dashboard/daten';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { gruppe } = await parent();
	const uebersicht = await gruppenUebersicht(gruppe.id, new Date());
	const sortierung = url.searchParams.get('sort') === 'rot' ? 'rot' : 'name';
	if (sortierung === 'rot')
		uebersicht.zeilen.sort((a, b) => b.rot - a.rot || a.label.localeCompare(b.label, 'de'));
	return { ...uebersicht, sortierung };
};
