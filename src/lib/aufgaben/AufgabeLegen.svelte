<script lang="ts">
	import { untrack } from 'svelte';
	import { einstellungen } from '$lib/einstellungen.svelte';
	import { warte } from '$lib/material/animation';
	import { TafelModell } from '$lib/material/modell.svelte';
	import Tafel from '$lib/material/Tafel.svelte';
	import Vorrat from '$lib/material/Vorrat.svelte';
	import ZahlTafel from '$lib/material/ZahlTafel.svelte';
	import { normiert } from '$lib/skills/material';
	import type { Antwort, Item, Stelle } from '$lib/skills/typen';
	import AufgabeKopf from './AufgabeKopf.svelte';
	import { spaltenFuer, type Modus } from './hilfe';
	import Weiter from './Weiter.svelte';

	/** Zahl mit Material legen: Vorrat antippen oder auf die Tafel ziehen, Spalte antippen legt eins dazu. */
	interface Props {
		item: Item;
		modus: Modus;
		onantwort: (a: Antwort) => void;
		onweiter: () => void;
	}
	let { item, modus, onantwort, onweiter }: Props = $props();
	let fertig = $state(false);
	let tafel: Tafel | undefined = $state();
	const gelegt: Stelle[] = [];

	// svelte-ignore state_referenced_locally
	const zahl = item.darstellung.typ === 'zahl' ? item.darstellung.zahl : 0;
	const modell = new TafelModell(
		{},
		spaltenFuer(normiert(zahl)),
		false,
		() => einstellungen.animationen
	);

	// Nur auf den Moduswechsel reagieren; die Animation selbst liest und schreibt das Modell.
	$effect(() => {
		if (modus === 'loesung') untrack(zeigeLoesung);
	});

	async function zeigeLoesung() {
		modell.zuruecksetzen();
		const ziel = normiert(zahl);
		for (const s of modell.spalten) {
			for (let i = 0; i < (ziel[s] ?? 0); i++) {
				await modell.hinzufuegen(s);
				if (einstellungen.animationen) await warte(60);
			}
		}
		fertig = true;
	}

	function nehmen(s: Stelle, abgelegtBei?: { x: number; y: number }) {
		gelegt.push(s);
		modell.hinzufuegen(s, abgelegtBei && tafel ? tafel.lokal(abgelegtBei) : undefined);
	}

	function zurueck() {
		const s = gelegt.pop();
		if (s) modell.entferneLetztes(s);
	}
</script>

<div class="aufgabe">
	<section class="oben">
		<AufgabeKopf text={item.prompt} />
		<ZahlTafel {zahl} />
		<div class="min-h-0 flex-1">
			<Tafel
				bind:this={tafel}
				{modell}
				ablage={modus !== 'loesung'}
				onspalte={modus !== 'loesung' ? (s) => nehmen(s) : undefined}
			/>
		</div>
	</section>

	<section class="unten">
		{#if modus === 'loesung'}
			<Weiter bereit={fertig} {onweiter} />
		{:else}
			<Vorrat spalten={modell.spalten} onnehmen={nehmen} />
			<div class="grid grid-cols-2 gap-2">
				<button
					type="button"
					class="min-h-16 rounded-xl bg-white text-xl font-semibold shadow"
					aria-label="Zurück"
					onclick={zurueck}>↶</button
				>
				<button
					type="button"
					class="min-h-16 rounded-xl bg-emerald-600 text-xl font-semibold text-white shadow"
					aria-label="Fertig"
					onclick={() => onantwort({ typ: 'material', material: modell.material() })}
					>✓ Fertig</button
				>
			</div>
		{/if}
	</section>
</div>
