<script lang="ts">
	import { untrack } from 'svelte';
	import Strahl from '$lib/components/Strahl.svelte';
	import Ziffernblock from '$lib/components/Ziffernblock.svelte';
	import { aufRaster } from '$lib/skills/generatoren/zahlenstrahl';
	import { zahlText } from '$lib/skills/text';
	import type { Antwort, Item } from '$lib/skills/typen';
	import AntwortAnzeige from './AntwortAnzeige.svelte';
	import AufgabeKopf from './AufgabeKopf.svelte';
	import { zahlAusEingabe } from './eingabe';
	import type { Modus } from './hilfe';
	import Weiter from './Weiter.svelte';

	/**
	 * Zahlenstrahl. Verorten: der Strahl in der unteren Hälfte ist der Regler (Daumen ziehen, fein
	 * mit den Wippen links und rechts). Ablesen: Pfeil auf dem Strahl, Antwort mit dem Ziffernblock. Hilfe: Zehnteleinteilung.
	 */
	interface Props {
		item: Item;
		modus: Modus;
		onantwort: (a: Antwort) => void;
		onweiter: () => void;
	}
	let { item, modus, onantwort, onweiter }: Props = $props();

	// svelte-ignore state_referenced_locally
	const d =
		item.darstellung.typ === 'strahl'
			? item.darstellung
			: { von: 0, bis: 1, modus: 'verorten' as const, zahl: 0, raster: 1 };
	let marke = $state<number | null>(null);
	let eingabe = $state('');
	let fertig = $state(false);
	const komma = d.raster < 1;

	$effect(() => {
		if (modus === 'loesung') untrack(() => (fertig = true));
	});

	const setze = (w: number) => (marke = Math.min(d.bis, Math.max(d.von, aufRaster(w, d.raster))));
	const wippe = (richtung: number) => setze((marke ?? (d.von + d.bis) / 2) + richtung * d.raster);
</script>

<div class="aufgabe">
	<section class="oben">
		<AufgabeKopf text={item.prompt} />
		{#if d.modus === 'verorten'}
			<p class="mt-6 text-center text-6xl font-bold tabular-nums" data-testid="gesucht">
				{zahlText(d.zahl)}
			</p>
		{:else}
			<div class="mt-6">
				<Strahl
					von={d.von}
					bis={d.bis}
					pfeil={d.zahl}
					teilung={modus !== 'versuch'}
					loesung={modus === 'loesung' ? d.zahl : null}
				/>
			</div>
		{/if}
		{#if modus === 'loesung'}
			<p class="mt-auto text-center text-4xl font-bold text-emerald-700" data-testid="loesung">
				{zahlText(d.zahl)}
			</p>
		{/if}
	</section>

	<section class="unten">
		{#if d.modus === 'verorten'}
			<div class="rounded-xl bg-white px-2 py-3">
				<Strahl
					von={d.von}
					bis={d.bis}
					{marke}
					teilung={modus !== 'versuch'}
					loesung={modus === 'loesung' ? d.zahl : null}
					onsetze={modus === 'loesung' ? undefined : setze}
				/>
			</div>
			{#if modus !== 'loesung'}
				<div class="grid grid-cols-[1fr_1fr_2fr] gap-2">
					<button
						type="button"
						class="knopf"
						aria-label="ein bisschen nach links"
						onclick={() => wippe(-1)}
						><svg
							viewBox="0 0 24 24"
							class="mx-auto h-8 w-8"
							fill="none"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg
						></button
					>
					<button
						type="button"
						class="knopf"
						aria-label="ein bisschen nach rechts"
						onclick={() => wippe(1)}
						><svg
							viewBox="0 0 24 24"
							class="mx-auto h-8 w-8"
							fill="none"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg
						></button
					>
					<button
						type="button"
						class="knopf bg-emerald-600! text-white"
						aria-label="Fertig"
						disabled={marke === null}
						onclick={() => marke !== null && onantwort({ typ: 'zahl', wert: marke })}
						>✓ Fertig</button
					>
				</div>
			{/if}
		{/if}
		{#if modus === 'loesung'}
			<Weiter bereit={fertig} {onweiter} />
		{:else if d.modus === 'ablesen'}
			<AntwortAnzeige wert={eingabe} />
			<Ziffernblock
				bind:wert={eingabe}
				maxLaenge={7}
				{komma}
				onbestaetigen={() => onantwort({ typ: 'zahl', wert: zahlAusEingabe(eingabe) })}
			/>
		{/if}
	</section>
</div>

<style>
	.knopf {
		min-height: 3.75rem;
		border-radius: 0.75rem;
		background: white;
		font-size: 1.5rem;
		font-weight: 700;
		box-shadow: 0 2px 0 rgb(0 0 0 / 0.15);
		touch-action: manipulation;
	}
	.knopf:disabled {
		opacity: 0.35;
	}
</style>
