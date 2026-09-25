<script lang="ts">
	import { untrack } from 'svelte';
	import Auswahlkarten from '$lib/components/Auswahlkarten.svelte';
	import StellenVergleich from '$lib/components/StellenVergleich.svelte';
	import { FARBE } from '$lib/material/farben';
	import { stellenVon } from '$lib/skills/generatoren/zahlen_vergleichen';
	import { STELLEN_NAME } from '$lib/skills/stellen';
	import { zahlText } from '$lib/skills/text';
	import type { Antwort, Item, Stelle, StellenName } from '$lib/skills/typen';
	import AufgabeKopf from './AufgabeKopf.svelte';
	import type { Modus } from './hilfe';
	import Weiter from './Weiter.svelte';

	/** Größere Zahl antippen, dann die Stelle, an der es sich entscheidet. Hilfe: Stellenwerttafel. */
	interface Props {
		item: Item;
		modus: Modus;
		onantwort: (a: Antwort) => void;
		onweiter: () => void;
	}
	let { item, modus, onantwort, onweiter }: Props = $props();

	// svelte-ignore state_referenced_locally
	const d =
		item.darstellung.typ === 'vergleich'
			? item.darstellung
			: { zahlen: [0, 1] as [number, number], stellen: [] as StellenName[] };
	// svelte-ignore state_referenced_locally
	const loesung = item.loesung.typ === 'vergleich' ? item.loesung : null;
	let gewaehlt = $state<0 | 1 | null>(null);
	let fertig = $state(false);
	const alleStellen = stellenVon(d.zahlen[0], d.zahlen[1]);
	const farbe = (s: StellenName) => (s in FARBE ? FARBE[s as Stelle].text : '#475569');

	$effect(() => {
		if (modus === 'loesung') untrack(() => (fertig = true));
	});
</script>

<div class="aufgabe">
	<section class="oben">
		<AufgabeKopf
			text={gewaehlt === null || modus === 'loesung' ? item.prompt : 'Welche Stelle entscheidet?'}
		/>
		{#if modus !== 'versuch' || gewaehlt !== null}
			<div class="mt-4">
				<StellenVergleich
					zahlen={d.zahlen}
					stellen={alleStellen}
					markiert={modus === 'loesung' ? loesung?.stelle : null}
					groessere={modus === 'loesung' ? loesung?.groessere : gewaehlt}
				/>
			</div>
		{/if}
		{#if modus === 'loesung' && loesung}
			<p class="mt-auto text-center text-2xl font-semibold text-emerald-700" data-testid="loesung">
				{zahlText(d.zahlen[loesung.groessere])} ist größer. Es entscheiden die {STELLEN_NAME[
					loesung.stelle
				]}.
			</p>
		{/if}
	</section>

	<section class="unten">
		{#if modus === 'loesung'}
			<Weiter bereit={fertig} {onweiter} />
		{:else if gewaehlt === null}
			<Auswahlkarten
				optionen={d.zahlen.map((z, i) => ({ wert: i as 0 | 1, text: zahlText(z) }))}
				onwahl={(i) => (gewaehlt = i)}
			/>
		{:else}
			<Auswahlkarten
				optionen={d.stellen.map((s) => ({
					wert: s,
					text: s,
					unter: STELLEN_NAME[s],
					farbe: farbe(s)
				}))}
				onwahl={(s) => onantwort({ typ: 'vergleich', groessere: gewaehlt!, stelle: s })}
			/>
			<button
				type="button"
				class="min-h-11 text-slate-600 underline"
				onclick={() => (gewaehlt = null)}>zurück</button
			>
		{/if}
	</section>
</div>
