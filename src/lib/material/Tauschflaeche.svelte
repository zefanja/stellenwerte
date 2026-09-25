<script lang="ts">
	import { STELLENNAME } from '$lib/skills/material';
	import { STELLEN } from '$lib/skills/material';
	import type { Stelle } from '$lib/skills/typen';
	import type { TafelModell } from './modell.svelte';
	import TeilBild from './TeilBild.svelte';

	/**
	 * Tauschfläche in der unteren Hälfte, Spalten bündig unter der Tafel:
	 * obere Reihe „10 bündeln“ (zur linken Spalte), untere Reihe „1 tauschen“ (in zehn der rechten Spalte).
	 * Zugleich Ablageziel, wenn Material aus der Tafel hierher gezogen wird.
	 */
	let {
		modell,
		buendeln = true,
		tauschen = true
	}: { modell: TafelModell; buendeln?: boolean; tauschen?: boolean } = $props();

	const links = (s: Stelle) => STELLEN[STELLEN.indexOf(s) - 1];
	const rechts = (s: Stelle) => STELLEN[STELLEN.indexOf(s) + 1];
</script>

<div
	class="flaeche"
	data-ablage="tausch"
	style:grid-template-columns="repeat({modell.spalten.length}, 1fr)"
>
	{#if buendeln}
		{#each modell.spalten as s (s)}
			{#if modell.spalten.includes(links(s))}
				<button
					type="button"
					class="knopf"
					disabled={!modell.kannBuendeln(s) || modell.beschaeftigt}
					aria-label="10 {STELLENNAME[s].mehrzahl} bündeln"
					onclick={() => modell.buendeln(s)}
				>
					<span class="pfeil">←</span>
					<span class="icon groß"><TeilBild art={links(s)} /></span>
					<span class="text">bündeln</span>
				</button>
			{:else}
				<span></span>
			{/if}
		{/each}
	{/if}
	{#if tauschen}
		{#each modell.spalten as s (s)}
			{#if modell.spalten.includes(rechts(s))}
				<button
					type="button"
					class="knopf"
					disabled={!modell.kannEntbuendeln(s) || modell.beschaeftigt}
					aria-label="1 {STELLENNAME[s].einzahl} tauschen"
					onclick={() => modell.entbuendeln(s)}
				>
					<span class="icon"><TeilBild art={rechts(s)} /></span>
					<span class="mal">×10</span>
					<span class="pfeil">→</span>
					<span class="text">tauschen</span>
				</button>
			{:else}
				<span></span>
			{/if}
		{/each}
	{/if}
</div>

<style>
	.flaeche {
		display: grid;
		gap: 0.5rem;
	}
	.knopf {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		min-height: 3.25rem;
		padding: 0.25rem 0.25rem 1rem;
		border-radius: 0.75rem;
		background: white;
		box-shadow: 0 2px 0 rgb(0 0 0 / 0.15);
		touch-action: manipulation;
		font-weight: 700;
	}
	.knopf:disabled {
		opacity: 0.35;
	}
	.knopf:active:not(:disabled) {
		transform: translateY(2px);
		box-shadow: none;
	}
	.icon {
		display: block;
		width: 1rem;
		height: 1rem;
	}
	.icon.groß {
		width: 1.5rem;
		height: 1.5rem;
	}
	.pfeil {
		font-size: 1.25rem;
		color: rgb(71 85 105);
	}
	.mal {
		font-size: 0.9rem;
	}
	.text {
		position: absolute;
		bottom: 0.15rem;
		font-size: 0.7rem;
		font-weight: 500;
		color: rgb(71 85 105);
	}
</style>
