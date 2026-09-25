<script lang="ts">
	import { untrack } from 'svelte';
	import Ziffernblock from '$lib/components/Ziffernblock.svelte';
	import { einstellungen } from '$lib/einstellungen.svelte';
	import { StreuModell } from '$lib/material/modell.svelte';
	import Streufeld from '$lib/material/Streufeld.svelte';
	import type { Antwort, Item } from '$lib/skills/typen';
	import AntwortAnzeige from './AntwortAnzeige.svelte';
	import AufgabeKopf from './AufgabeKopf.svelte';
	import type { Modus } from './hilfe';
	import Weiter from './Weiter.svelte';

	/** Ungeordnete Menge bündeln, dann die Anzahl eintippen. */
	interface Props {
		item: Item;
		modus: Modus;
		onantwort: (a: Antwort) => void;
		onweiter: () => void;
	}
	let { item, modus, onantwort, onweiter }: Props = $props();

	let eingabe = $state('');
	let fertig = $state(false);

	// svelte-ignore state_referenced_locally
	const start = item.darstellung.typ === 'material' ? item.darstellung.material : {};
	// svelte-ignore state_referenced_locally
	const modell = new StreuModell(start, item.seed, () => einstellungen.animationen);

	// Nur auf den Moduswechsel reagieren; die Animation selbst liest und schreibt das Modell.
	$effect(() => {
		if (modus === 'loesung') untrack(zeigeLoesung);
	});

	async function zeigeLoesung() {
		modell.zuruecksetzen();
		await modell.allesBuendeln();
		fertig = true;
	}

	function buendeln() {
		if (modell.ausgewaehlt === 10) modell.buendeln();
		else modell.zehnBuendeln();
	}
</script>

<div class="aufgabe">
	<section class="oben">
		<AufgabeKopf text={item.prompt} />
		<div class="min-h-0 flex-1"><Streufeld {modell} /></div>
		{#if modus === 'loesung' && fertig && item.loesung.typ === 'zahl'}
			<p class="text-center text-4xl font-bold text-emerald-700" data-testid="loesung">
				{item.loesung.wert}
			</p>
		{/if}
	</section>

	<section class="unten">
		{#if modus === 'loesung'}
			<Weiter bereit={fertig} {onweiter} />
		{:else}
			<div class="flex gap-2">
				<button
					type="button"
					class="flex min-h-14 flex-1 items-center justify-center gap-3 rounded-xl bg-white text-lg font-semibold shadow disabled:opacity-35"
					disabled={modell.loseWuerfel < 10 || modell.beschaeftigt}
					onclick={buendeln}
				>
					<span class="flex gap-0.5" aria-hidden="true">
						{#each { length: 10 }, i (i)}
							<span
								class="h-3 w-3 rounded-sm border border-amber-700 {i < modell.ausgewaehlt
									? 'bg-amber-400'
									: 'bg-white'}"
							></span>
						{/each}
					</span>
					10 bündeln
				</button>
			</div>
			<AntwortAnzeige wert={eingabe} />
			<Ziffernblock
				bind:wert={eingabe}
				maxLaenge={4}
				onbestaetigen={() => onantwort({ typ: 'zahl', wert: Number(eingabe) })}
			/>
		{/if}
	</section>
</div>
