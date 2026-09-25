<script lang="ts">
	import { untrack } from 'svelte';
	import Ziffernblock from '$lib/components/Ziffernblock.svelte';
	import { einstellungen } from '$lib/einstellungen.svelte';
	import { FARBE } from '$lib/material/farben';
	import { TafelModell } from '$lib/material/modell.svelte';
	import Tafel from '$lib/material/Tafel.svelte';
	import Tauschflaeche from '$lib/material/Tauschflaeche.svelte';
	import ZahlTafel from '$lib/material/ZahlTafel.svelte';
	import { STELLEN, STELLENNAME } from '$lib/skills/material';
	import type { Antwort, Item } from '$lib/skills/typen';
	import { zahlwortGetrennt } from '$lib/skills/zahlwort';
	import AntwortAnzeige from './AntwortAnzeige.svelte';
	import AufgabeKopf from './AufgabeKopf.svelte';
	import { hilfsmaterial, spaltenFuer, tauschRichtungen, type Modus } from './hilfe';
	import Weiter from './Weiter.svelte';

	/** Alle Aufgaben mit Ziffernblock: Material als Zahl, Zahlwort, nicht normiert, Bündel zählen und umkehren. */
	interface Props {
		item: Item;
		modus: Modus;
		onantwort: (a: Antwort) => void;
		onweiter: () => void;
	}
	let { item, modus, onantwort, onweiter }: Props = $props();

	let eingabe = $state('');
	let fertig = $state(false);

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
		const ziel = i.darstellung.typ === 'buendel' ? i.darstellung.stelle : undefined;
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
		if (modell) {
			modell.zuruecksetzen();
			if (zielStelle) {
				await modell.entbuendelnBis(zielStelle);
				modell.zaehler = zielStelle;
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
		{/if}

		{#if zeigeTafel && modell}
			<div class="min-h-0 flex-1">
				<Tafel {modell} tauschen={modus === 'hilfe' && richtungen.tauschen} />
			</div>
		{/if}

		{#if modus === 'loesung' && fertig}
			<p class="text-center text-4xl font-bold text-emerald-700" data-testid="loesung">
				{loesung}{#if zielStelle}&nbsp;{STELLENNAME[zielStelle].mehrzahl}{/if}
			</p>
		{/if}
	</section>

	<section class="unten">
		{#if modus === 'loesung'}
			<Weiter bereit={fertig} {onweiter} />
		{:else}
			{#if modus === 'hilfe' && modell && (richtungen.buendeln || richtungen.tauschen)}
				<Tauschflaeche {modell} buendeln={richtungen.buendeln} tauschen={richtungen.tauschen} />
			{/if}
			<AntwortAnzeige wert={eingabe} />
			<Ziffernblock bind:wert={eingabe} maxLaenge={7} onbestaetigen={bestaetigen} />
		{/if}
	</section>
</div>
