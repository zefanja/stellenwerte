<script lang="ts">
	import { untrack } from 'svelte';
	import Ziffernblock from '$lib/components/Ziffernblock.svelte';
	import { einstellungen } from '$lib/einstellungen.svelte';
	import { warte } from '$lib/material/animation';
	import { schrittStelle, stellenwechsel } from '$lib/material/ablaeufe';
	import { TafelModell } from '$lib/material/modell.svelte';
	import Tafel from '$lib/material/Tafel.svelte';
	import { normiert } from '$lib/skills/material';
	import { zahlText } from '$lib/skills/text';
	import type { Antwort, Item } from '$lib/skills/typen';
	import AufgabeKopf from './AufgabeKopf.svelte';
	import { spaltenFuer, type Modus } from './hilfe';
	import Weiter from './Weiter.svelte';

	/**
	 * Rechenkette: von Start bis Ziel in gleichen Schritten, jede Lücke mit dem Ziffernblock.
	 * Hilfe: Material des Startwerts; „+10 legen“ zeigt den Stellenwechsel Schritt für Schritt.
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
		item.darstellung.typ === 'kette'
			? item.darstellung
			: { start: 0, ziel: 0, op: '+' as const, schritt: 1, laenge: 0 };
	// svelte-ignore state_referenced_locally
	const soll = item.loesung.typ === 'kette' ? item.loesung.werte : [];
	let werte = $state<string[]>(Array(d.laenge).fill(''));
	let aktiv = $state(0);
	let fertig = $state(false);
	let schritteGelegt = $state(0);

	const hoechster = Math.max(d.start, d.ziel);
	const modell =
		hoechster <= 9999
			? new TafelModell(
					normiert(d.start),
					spaltenFuer(normiert(hoechster), schrittStelle(d.schritt)),
					true,
					() => einstellungen.animationen
				)
			: null;

	$effect(() => {
		if (modus === 'loesung') untrack(zeigeLoesung);
	});

	async function zeigeLoesung() {
		modell?.zuruecksetzen();
		werte = Array(d.laenge).fill('');
		for (let i = 0; i < d.laenge; i++) {
			if (modell) await stellenwechsel(modell, d.op, schrittStelle(d.schritt));
			werte[i] = String(soll[i]);
			if (einstellungen.animationen) await warte(250);
		}
		aktiv = -1;
		fertig = true;
	}

	async function legeSchritt() {
		if (!modell || modell.beschaeftigt || schritteGelegt > d.laenge) return;
		schritteGelegt++;
		await stellenwechsel(modell, d.op, schrittStelle(d.schritt));
	}

	function bestaetigen() {
		if (aktiv < d.laenge - 1) aktiv++;
		else onantwort({ typ: 'kette', werte: werte.map(Number) });
	}

	/** Löschen im leeren Feld springt zurück ins vorige */
	let eingabe = $derived(werte[aktiv] ?? '');
	function setzeEingabe(v: string) {
		if (v === '' && werte[aktiv] === '' && aktiv > 0) aktiv--;
		else werte[aktiv] = v;
	}
</script>

<div class="aufgabe">
	<section class="oben">
		<AufgabeKopf text={item.prompt} />
		<ol class="flex flex-wrap items-center justify-center gap-x-1 gap-y-2" data-testid="kette">
			<li class="feld fest">{zahlText(d.start)}</li>
			{#each werte as w, i (i)}
				<li class="text-sm font-semibold text-slate-500">{d.op}{zahlText(d.schritt)}</li>
				<li class="feld {i === aktiv && modus !== 'loesung' ? 'aktiv' : ''}" data-testid="luecke">
					{w ? zahlText(Number(w.replace(',', '.'))) : ''}
				</li>
			{/each}
			<li class="text-sm font-semibold text-slate-500">{d.op}{zahlText(d.schritt)}</li>
			<li class="feld fest">{zahlText(d.ziel)}</li>
		</ol>
		{#if modell && modus !== 'versuch'}
			<div class="min-h-0 flex-1"><Tafel {modell} /></div>
		{/if}
	</section>

	<section class="unten">
		{#if modus === 'loesung'}
			<Weiter bereit={fertig} {onweiter} />
		{:else}
			{#if modus === 'hilfe' && modell}
				<button
					type="button"
					class="min-h-14 rounded-xl bg-white text-lg font-semibold shadow disabled:opacity-35"
					disabled={modell.beschaeftigt || schritteGelegt > d.laenge}
					onclick={legeSchritt}
				>
					{d.op}
					{zahlText(d.schritt)} legen
				</button>
			{/if}
			<Ziffernblock
				bind:wert={() => eingabe, setzeEingabe}
				maxLaenge={6}
				bereit={eingabe.length > 0}
				onbestaetigen={bestaetigen}
			/>
		{/if}
	</section>
</div>

<style>
	.feld {
		display: flex;
		min-width: 4.25rem;
		height: 3rem;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		border: 2px solid rgb(203 213 225);
		background: white;
		padding: 0 0.4rem;
		font-size: 1.5rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.feld.fest {
		background: rgb(241 245 249);
		border-color: transparent;
	}
	.feld.aktiv {
		border-color: #0369a1;
		box-shadow: 0 0 0 3px rgb(186 230 253);
	}
</style>
