<script lang="ts">
	import TeilBild from '$lib/material/TeilBild.svelte';
	import { STELLEN } from '$lib/skills/material';
	import type { Material } from '$lib/skills/typen';

	/** Kleines Materialbild einer Zahl in einer Zeile, z. B. für den Abzug „− 27“ */
	let { material }: { material: Material } = $props();
	const groesse = { T: [22, 22], H: [22, 22], Z: [5, 22], E: [6, 6] } as const;
</script>

<span class="inline-flex items-end gap-1" aria-hidden="true">
	{#each STELLEN as s (s)}
		{#each { length: material[s] ?? 0 }, i (i)}
			<span class="block" style:width="{groesse[s][0]}px" style:height="{groesse[s][1]}px"
				><TeilBild art={s} /></span
			>
		{/each}
	{/each}
</span>
