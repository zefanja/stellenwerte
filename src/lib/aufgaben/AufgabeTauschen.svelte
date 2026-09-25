<script lang="ts">
	import { ohneHalt, SATZ, type Schrittfolge } from './schritte.svelte';
	import { untrack } from 'svelte';
	import { einstellungen } from '$lib/einstellungen.svelte';
	import { TafelModell } from '$lib/material/modell.svelte';
	import Tafel from '$lib/material/Tafel.svelte';
	import Tauschflaeche from '$lib/material/Tauschflaeche.svelte';
	import { normiert } from '$lib/skills/material';
	import type { Antwort, Item } from '$lib/skills/typen';
	import AufgabeKopf from './AufgabeKopf.svelte';
	import { spaltenFuer, type Modus } from './hilfe';
	import MaterialMini from './MaterialMini.svelte';
	import Weiter from './Weiter.svelte';

	/** „Was musst du tauschen?“: so lange tauschen, bis die Wegnahme an jeder Stelle geht. */
	interface Props {
		item: Item;
		modus: Modus;
		onantwort: (a: Antwort) => void;
		onweiter: () => void;
		/** nur im Beispiel („Schau zu“): Schritte einzeln bestätigen */
		schritte?: Schrittfolge;
	}
	let { item, modus, onantwort, onweiter, schritte }: Props = $props();
	let fertig = $state(false);

	// svelte-ignore state_referenced_locally
	const d =
		item.darstellung.typ === 'wegnahme' ? item.darstellung : { zahl: 0, abzug: 0, material: {} };
	const modell = new TafelModell(
		d.material,
		spaltenFuer(d.material),
		false,
		() => einstellungen.animationen
	);

	// Nur auf den Moduswechsel reagieren; die Animation selbst liest und schreibt das Modell.
	$effect(() => {
		if (modus === 'loesung') untrack(zeigeLoesung);
	});

	async function zeigeLoesung() {
		const takt = schritte?.takt ?? ohneHalt;
		modell.zuruecksetzen();
		if (schritte) await takt(`${d.zahl} − ${d.abzug}: Reicht das Material zum Wegnehmen?`);
		if (item.loesung.typ === 'material') {
			const ziel = item.loesung.material;
			for (const s of modell.spalten) {
				while (modell.anzahl(s) > (ziel[s] ?? 0) && modell.kannEntbuendeln(s)) {
					await takt(SATZ.entbuendeln(s));
					await modell.entbuendeln(s);
				}
			}
		}
		schritte?.fertig('Fertig! So geht es.');
		fertig = true;
	}
</script>

<div class="aufgabe">
	<section class="oben">
		<AufgabeKopf text={item.prompt} />
		<p class="flex items-center justify-center gap-3 text-4xl font-bold" data-testid="wegnahme">
			<span>{d.zahl}</span><span>−</span><span>{d.abzug}</span>
			<MaterialMini material={normiert(d.abzug)} />
		</p>
		<div class="min-h-0 flex-1"><Tafel {modell} tauschen={modus !== 'loesung'} /></div>
		{#if modus === 'loesung' && fertig}
			<p class="text-center text-2xl font-semibold text-emerald-700" data-testid="loesung">
				Jetzt kannst du {d.abzug} wegnehmen.
			</p>
		{/if}
	</section>

	<section class="unten">
		{#if modus === 'loesung'}
			<Weiter bereit={fertig} {onweiter} {schritte} />
		{:else}
			<Tauschflaeche {modell} />
			<div class="grid grid-cols-2 gap-2">
				<button
					type="button"
					class="min-h-16 rounded-xl bg-white text-xl font-semibold shadow"
					onclick={() => modell.zuruecksetzen()}>↶ Neu</button
				>
				<button
					type="button"
					class="min-h-16 rounded-xl bg-emerald-600 text-xl font-semibold text-white shadow"
					aria-label="Fertig"
					disabled={modell.beschaeftigt}
					onclick={() => onantwort({ typ: 'material', material: modell.material() })}
					>✓ Fertig</button
				>
			</div>
		{/if}
	</section>
</div>
