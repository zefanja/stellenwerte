import { requireOwnGroup } from '$lib/server/auth/guard';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	const g = await requireOwnGroup(locals, params.id);
	return { gruppe: { id: g.id, name: g.name, activeTrack: g.activeTrack } };
};
