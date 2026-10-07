<script lang="ts">
	import { FARBE } from './farben';
	import { zahlText } from '$lib/skills/text';
	import type { Stelle } from '$lib/skills/typen';

	/**
	 * Zahl in der Stellenwerttafel: jede Ziffer unter ihrem Spaltenkopf, in der Farbe der Stelle.
	 * Dezimalzahlen bekommen das Komma zwischen Einern und Zehnteln: 29,1 → Z E , z
	 */
	let { zahl }: { zahl: number } = $props();
	const GANZ = ['HT', 'ZT', 'T', 'H', 'Z', 'E'];
	const NACH = ['z', 'h', 't'];
	const spalten = $derived.by(() => {
		const [ganz, nach = ''] = String(zahl).split('.');
		const koepfe = [...GANZ.slice(GANZ.length - ganz.length), ...NACH.slice(0, nach.length)];
		return [...ganz, ...nach].map((ziffer, i) => ({
			ziffer,
			kopf: koepfe[i],
			komma: nach.length > 0 && i === ganz.length - 1
		}));
	});
	const farbe = (k: string) => (k in FARBE ? FARBE[k as Stelle].text : '#475569');
</script>

<div class="flex justify-center" aria-label={zahlText(zahl)} role="img">
	{#each spalten as s, i (i)}
		<div
			class="relative flex w-14 flex-col items-center border-slate-200 {i > 0 &&
			!spalten[i - 1].komma
				? 'border-l-2'
				: ''}"
		>
			<span class="text-lg font-bold" style:color={farbe(s.kopf)}>{s.kopf}</span>
			<span class="text-5xl font-bold" style:color={farbe(s.kopf)}>{s.ziffer}</span>
			{#if s.komma}
				<!-- anstelle der Spaltenlinie, damit jede Ziffer mittig unter ihrem Kopf bleibt -->
				<span
					class="absolute -right-1.5 bottom-0 w-3 text-center text-5xl font-bold text-slate-700"
					data-testid="komma">,</span
				>
			{/if}
		</div>
	{/each}
</div>
