<script lang="ts">
	import { FARBE } from './farben';
	import type { Stelle } from '$lib/skills/typen';

	/** Zahl in der Stellenwerttafel: jede Ziffer unter ihrem Spaltenkopf, in der Farbe der Stelle. */
	let { zahl }: { zahl: number } = $props();
	const KOEPFE = ['HT', 'ZT', 'T', 'H', 'Z', 'E'];
	const ziffern = $derived(String(zahl).split(''));
	const koepfe = $derived(KOEPFE.slice(KOEPFE.length - ziffern.length));
	const farbe = (k: string) => (k in FARBE ? FARBE[k as Stelle].text : '#475569');
</script>

<div class="flex justify-center" aria-label={String(zahl)} role="img">
	{#each ziffern as z, i (i)}
		<div class="flex w-14 flex-col items-center border-slate-200 {i > 0 ? 'border-l-2' : ''}">
			<span class="text-lg font-bold" style:color={farbe(koepfe[i])}>{koepfe[i]}</span>
			<span class="text-5xl font-bold" style:color={farbe(koepfe[i])}>{z}</span>
		</div>
	{/each}
</div>
