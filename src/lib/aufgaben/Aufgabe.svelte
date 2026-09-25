<script lang="ts">
	import { SKILLS } from '$lib/skills/katalog';
	import type { Antwort, Item } from '$lib/skills/typen';
	import AufgabeBuendeln from './AufgabeBuendeln.svelte';
	import AufgabeLegen from './AufgabeLegen.svelte';
	import AufgabeTauschen from './AufgabeTauschen.svelte';
	import AufgabeZiffern from './AufgabeZiffern.svelte';
	import type { Modus } from './hilfe';

	/** Wählt die Aufgabenkomponente nach dem Eingabetyp des Skills. */
	let props: { item: Item; modus: Modus; onantwort: (a: Antwort) => void; onweiter: () => void } =
		$props();
	const typ = $derived(SKILLS.get(props.item.skillId)?.eingabe_typ);
</script>

{#if typ === 'material_buendeln'}
	<AufgabeBuendeln {...props} />
{:else if typ === 'material_tauschen'}
	<AufgabeTauschen {...props} />
{:else if typ === 'material_legen'}
	<AufgabeLegen {...props} />
{:else}
	<AufgabeZiffern {...props} />
{/if}
