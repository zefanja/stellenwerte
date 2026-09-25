<script lang="ts">
	import type { Stelle } from '$lib/skills/typen';
	import { FARBE } from './farben';
	import type { Lage } from './layout';

	/** Zehnersystem-Material als SVG: Einerwürfel, Zehnerstange, Hunderterplatte, Tausenderwürfel */
	/** fein=false: ohne Innenlinien, damit sehr kleine Teile nicht zu Farbblöcken verschwimmen */
	let {
		art,
		lage = 'stehend',
		fein = true
	}: { art: Stelle; lage?: Lage; fein?: boolean } = $props();
	const f = $derived(FARBE[art]);
	const zehn = $derived(fein ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : []);
</script>

{#if art === 'E'}
	<svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
		<rect
			width="1"
			height="1"
			fill={f.fuellung}
			stroke={f.linie}
			stroke-width="1.5"
			vector-effect="non-scaling-stroke"
		/>
	</svg>
{:else if art === 'Z'}
	{@const stehend = lage === 'stehend'}
	<svg viewBox={stehend ? '0 0 1 10' : '0 0 10 1'} preserveAspectRatio="none" aria-hidden="true">
		<rect
			width={stehend ? 1 : 10}
			height={stehend ? 10 : 1}
			fill={f.fuellung}
			stroke={f.linie}
			stroke-width="1.5"
			vector-effect="non-scaling-stroke"
		/>
		{#each zehn as i (i)}
			<line
				x1={stehend ? 0 : i}
				y1={stehend ? i : 0}
				x2={stehend ? 1 : i}
				y2={stehend ? i : 1}
				stroke={f.linie}
				stroke-width="0.75"
				vector-effect="non-scaling-stroke"
			/>
		{/each}
	</svg>
{:else if art === 'H'}
	<svg viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden="true">
		<rect
			width="10"
			height="10"
			fill={f.fuellung}
			stroke={f.linie}
			stroke-width="1.5"
			vector-effect="non-scaling-stroke"
		/>
		{#each zehn as i (i)}
			<line
				x1={i}
				y1="0"
				x2={i}
				y2="10"
				stroke={f.linie}
				stroke-width="0.5"
				vector-effect="non-scaling-stroke"
			/>
			<line
				x1="0"
				y1={i}
				x2="10"
				y2={i}
				stroke={f.linie}
				stroke-width="0.5"
				vector-effect="non-scaling-stroke"
			/>
		{/each}
	</svg>
{:else}
	<!-- Tausenderwürfel: Vorderseite, Deckel und Seite -->
	<svg viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden="true">
		<polygon
			points="0,3 7,3 7,10 0,10"
			fill={f.fuellung}
			stroke={f.linie}
			stroke-width="1.5"
			vector-effect="non-scaling-stroke"
		/>
		<polygon
			points="0,3 3,0 10,0 7,3"
			fill="#ddd6fe"
			stroke={f.linie}
			stroke-width="1.5"
			vector-effect="non-scaling-stroke"
		/>
		<polygon
			points="7,3 10,0 10,7 7,10"
			fill="#a78bfa"
			stroke={f.linie}
			stroke-width="1.5"
			vector-effect="non-scaling-stroke"
		/>
		{#each fein ? [1, 2, 3, 4, 5, 6] : [] as i (i)}
			<line
				x1={i}
				y1="3"
				x2={i}
				y2="10"
				stroke={f.linie}
				stroke-width="0.5"
				vector-effect="non-scaling-stroke"
			/>
			<line
				x1="0"
				y1={3 + i}
				x2="7"
				y2={3 + i}
				stroke={f.linie}
				stroke-width="0.5"
				vector-effect="non-scaling-stroke"
			/>
		{/each}
	</svg>
{/if}

<style>
	svg {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
</style>
