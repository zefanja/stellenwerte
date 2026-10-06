<script lang="ts">
	import { langDruck } from './gesten';
	import type { StreuModell } from './modell.svelte';
	import TeilSicht from './TeilSicht.svelte';

	let { modell }: { modell: StreuModell } = $props();

	let breite = $state(0);
	let hoehe = $state(0);
	let zelle = $derived(breite > 0 ? Math.max(28, Math.min(48, breite / 8)) : 44);

	$effect(() => {
		if (breite > 0 && hoehe > 0) modell.setzeGroesse(breite, hoehe);
	});
</script>

<!-- Mindesthöhe: in niedrigen Fenstern scrollt die Seite, statt dass Würfel keinen Platz finden -->
<div
	class="feld"
	bind:clientWidth={breite}
	bind:clientHeight={hoehe}
	style:min-height={breite > 0 ? `${modell.mindestHoehe(breite)}px` : null}
>
	{#each modell.teile as t (t.id)}
		{#if t.art === 'E'}
			<!-- Tippzelle um den Würfel, deutlich größer als der Würfel selbst -->
			<button
				type="button"
				class="treffer"
				aria-label="Würfel"
				aria-pressed={t.ausgewaehlt}
				style:width="{zelle}px"
				style:height="{zelle}px"
				style:transform="translate({t.x + t.b / 2 - zelle / 2}px, {t.y + t.h / 2 - zelle / 2}px)"
				onclick={() => modell.umschalten(t.id)}
			></button>
		{:else}
			<button
				type="button"
				class="treffer"
				aria-label="Zehnerstange"
				style:width="{t.b}px"
				style:height="{Math.max(t.h, 28)}px"
				style:transform="translate({t.x}px, {t.y + t.h / 2 - Math.max(t.h, 28) / 2}px)"
				use:langDruck={() => modell.entbuendeln(t.id)}
			></button>
		{/if}
		<TeilSicht teil={t} />
	{/each}
</div>

<style>
	.feld {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		border-radius: 0.75rem;
		background: white;
		touch-action: none;
		user-select: none;
	}
	.treffer {
		position: absolute;
		left: 0;
		top: 0;
		background: transparent;
		touch-action: manipulation;
	}
</style>
