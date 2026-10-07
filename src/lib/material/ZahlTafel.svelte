<script lang="ts">
	import { FARBE } from './farben';
	import { zahlText } from '$lib/skills/text';
	import type { Stelle } from '$lib/skills/typen';

	/**
	 * Zahl in der Stellenwerttafel: jede Ziffer unter ihrem Spaltenkopf, in der Farbe der Stelle.
	 * Dezimalzahlen bekommen eine schmale Spalte ohne Kopf für das Komma: 29,1 → Z E , z
	 */
	let { zahl }: { zahl: number } = $props();
	const GANZ = ['HT', 'ZT', 'T', 'H', 'Z', 'E'];
	const NACH = ['z', 'h', 't'];
	const spalten = $derived.by(() => {
		const [ganz, nach = ''] = String(zahl).split('.');
		const stellen = (ziffern: string, koepfe: string[]) =>
			[...ziffern].map((ziffer, i) => ({ ziffer, kopf: koepfe[i] }));
		return [
			...stellen(ganz, GANZ.slice(GANZ.length - ganz.length)),
			...(nach ? [{ ziffer: ',', kopf: '' }] : []),
			...stellen(nach, NACH)
		];
	});
	const farbe = (k: string) => (k in FARBE ? FARBE[k as Stelle].text : '#475569');
</script>

<div class="flex justify-center" aria-label={zahlText(zahl)} role="img">
	{#each spalten as s, i (i)}
		<div
			class="flex flex-col items-center border-slate-200 {s.kopf ? 'w-14' : 'w-6'} {i > 0
				? 'border-l-2'
				: ''}"
			data-testid={s.kopf ? undefined : 'komma'}
		>
			<!-- geschütztes Leerzeichen hält die Kommaspalte so hoch wie die anderen -->
			<span class="text-lg font-bold" style:color={farbe(s.kopf)}>{s.kopf || ' '}</span>
			<span class="text-5xl font-bold" style:color={farbe(s.kopf)}>{s.ziffer}</span>
		</div>
	{/each}
</div>
