<script lang="ts">
	import { untrack } from 'svelte';
	import Ziffernblock from '$lib/components/Ziffernblock.svelte';
	import { einstellungen } from '$lib/einstellungen.svelte';
	import { FARBE } from '$lib/material/farben';
	import { TafelModell } from '$lib/material/modell.svelte';
	import Tafel from '$lib/material/Tafel.svelte';
	import Tauschflaeche from '$lib/material/Tauschflaeche.svelte';
	import ZahlTafel from '$lib/material/ZahlTafel.svelte';
	import { schrittStelle, stellenwechsel } from '$lib/material/ablaeufe';
	import { normiert, STELLEN } from '$lib/skills/material';
	import { STELLEN_NAME } from '$lib/skills/stellen';
	import { zahlText } from '$lib/skills/text';
	import type { Antwort, Item } from '$lib/skills/typen';
	import { zahlwortGetrennt } from '$lib/skills/zahlwort';
	import AntwortAnzeige from './AntwortAnzeige.svelte';
	import AufgabeKopf from './AufgabeKopf.svelte';
	import { hilfsmaterial, spaltenFuer, tafelStelle, tauschRichtungen, type Modus } from './hilfe';
	import Weiter from './Weiter.svelte';

	/**
	 * Alle Aufgaben mit Ziffernblock: Material als Zahl, Zahlwort, nicht normiert, Bündel zählen
	 * und umkehren, Stelle verändern.
	 */
	interface Props {
		item: Item;
		modus: Modus;
		onantwort: (a: Antwort) => void;
		onweiter: () => void;
	}
	let { item, modus, onantwort, onweiter }: Props = $props();

	let eingabe = $state('');
	let fertig = $state(false);
	let gelegt = $state(false);

	const d = $derived(item.darstellung);
	const loesung = $derived(item.loesung.typ === 'zahl' ? item.loesung.wert : 0);
	const zielStelle = $derived(d.typ === 'buendel' ? d.stelle : undefined);
	const richtungen = $derived(tauschRichtungen(item));
	// Im ersten Versuch nur dort Material, wo es die Aufgabe selbst ist; sonst erst als Hilfe
	const materialImVersuch = $derived(
		d.typ === 'material' || d.typ === 'stellen' || d.typ === 'buendel_umkehr'
	);

	function neuesModell(i: Item) {
		const m = hilfsmaterial(i);
		if (!m) return null;
		const d = i.darstellung;
		if (d.typ === 'rechnung') {
			// Platz für den Übertrag: Spalten nach der größeren der beiden Zahlen
			const r = d.op === '+' ? d.zahl + d.schritt : d.zahl - d.schritt;
			return new TafelModell(
				m,
				spaltenFuer(normiert(Math.max(d.zahl, r)), schrittStelle(d.schritt)),
				true,
				() => einstellungen.animationen
			);
		}
		const ziel = d.typ === 'buendel' ? tafelStelle(d.stelle) : undefined;
		return new TafelModell(m, spaltenFuer(m, ziel), true, () => einstellungen.animationen);
	}
	// Die Komponente wird je Aufgabe und Versuch neu erzeugt; das Modell gehört zu dieser Instanz.
	// svelte-ignore state_referenced_locally
	const modell = neuesModell(item);
	const zeigeTafel = $derived(!!modell && (materialImVersuch || modus !== 'versuch'));

	// Nur auf den Moduswechsel reagieren; die Animation selbst liest und schreibt das Modell.
	$effect(() => {
		if (modus === 'loesung') untrack(zeigeLoesung);
	});

	async function zeigeLoesung() {
		const ziel = zielStelle && tafelStelle(zielStelle);
		if (modell) {
			modell.zuruecksetzen();
			if (d.typ === 'rechnung') {
				await stellenwechsel(modell, d.op, schrittStelle(d.schritt));
				await modell.zuZiffern();
			} else if (ziel) {
				await modell.entbuendelnBis(ziel);
				modell.zaehler = ziel;
			} else {
				await modell.normieren();
				await modell.zuZiffern();
			}
		}
		fertig = true;
	}

	function bestaetigen() {
		onantwort({ typ: 'zahl', wert: Number(eingabe) });
	}
</script>

<div class="aufgabe">
	<section class="oben">
		<AufgabeKopf text={item.prompt} />

		{#if d.typ === 'zahlwort'}
			<!-- weiche Trennstellen an den Wortbausteinen: ein-hundert-acht-und-sechzig -->
			<p class="my-2 text-center text-3xl font-semibold" data-testid="zahlwort" aria-label={d.wort}>
				{zahlwortGetrennt(loesung)}
			</p>
		{:else if d.typ === 'stellen'}
			<p class="my-1 text-center text-3xl font-bold" data-testid="stellen">
				{#each STELLEN.filter((s) => d.material[s] !== undefined) as s (s)}
					<span class="mx-1" style:color={FARBE[s].text}>{d.material[s]}&nbsp;{s}</span>
				{/each}
			</p>
		{:else if d.typ === 'buendel' && !zeigeTafel}
			<ZahlTafel zahl={d.zahl} />
		{:else if d.typ === 'rechnung'}
			<p class="my-1 text-center text-4xl font-bold tabular-nums" data-testid="rechnung">
				{zahlText(d.zahl)}&nbsp;{d.op}&nbsp;{zahlText(d.schritt)}
			</p>
			{#if !zeigeTafel}<ZahlTafel zahl={d.zahl} />{/if}
		{/if}

		{#if zeigeTafel && modell}
			<div class="min-h-0 flex-1">
				<Tafel {modell} tauschen={modus === 'hilfe' && richtungen.tauschen} />
			</div>
		{/if}

		{#if modus === 'loesung' && fertig}
			<p class="text-center text-4xl font-bold text-emerald-700" data-testid="loesung">
				{zahlText(loesung)}{#if zielStelle}&nbsp;{STELLEN_NAME[zielStelle]}{/if}
			</p>
		{/if}
	</section>

	<section class="unten">
		{#if modus === 'loesung'}
			<Weiter bereit={fertig} {onweiter} />
		{:else}
			{#if modus === 'hilfe' && modell && d.typ === 'rechnung'}
				<!-- den Schritt selbst legen und den Stellenwechsel beobachten -->
				<button
					type="button"
					class="min-h-12 rounded-xl bg-white text-lg font-semibold shadow disabled:opacity-35"
					disabled={modell.beschaeftigt || gelegt}
					onclick={async () => {
						gelegt = true;
						if (d.typ === 'rechnung') await stellenwechsel(modell, d.op, schrittStelle(d.schritt));
					}}>{d.op} {zahlText(d.schritt)} legen</button
				>
			{:else if modus === 'hilfe' && modell && (richtungen.buendeln || richtungen.tauschen)}
				<Tauschflaeche {modell} buendeln={richtungen.buendeln} tauschen={richtungen.tauschen} />
			{/if}
			<AntwortAnzeige wert={eingabe} />
			<Ziffernblock bind:wert={eingabe} maxLaenge={7} onbestaetigen={bestaetigen} />
		{/if}
	</section>
</div>
