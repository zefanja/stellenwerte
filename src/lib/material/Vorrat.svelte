<script lang="ts">
	import { STELLENNAME } from '$lib/skills/material';
	import type { Stelle } from '$lib/skills/typen';
	import { ziehbar } from './gesten';
	import TeilBild from './TeilBild.svelte';

	/** Materialvorrat: Antippen legt ein Teil in seine Spalte, Ziehen auf die Tafel ebenso. */
	interface Props {
		spalten: readonly Stelle[];
		onnehmen: (s: Stelle, abgelegtBei?: { x: number; y: number }) => void;
		gesperrt?: boolean;
	}
	let { spalten, onnehmen, gesperrt = false }: Props = $props();

	const groesse: Record<Stelle, [number, number]> = {
		T: [40, 40],
		H: [40, 40],
		Z: [8, 40],
		E: [14, 14]
	};
</script>

<div class="vorrat" style:grid-template-columns="repeat({spalten.length}, 1fr)">
	{#each spalten as s (s)}
		<button
			type="button"
			class="knopf"
			disabled={gesperrt}
			aria-label="{STELLENNAME[s].einzahl} nehmen"
			onclick={() => onnehmen(s)}
			use:ziehbar={{ onablegen: (ziel, punkt) => ziel === 'tafel' && onnehmen(s, punkt) }}
		>
			<span class="bild" style:width="{groesse[s][0]}px" style:height="{groesse[s][1]}px"
				><TeilBild art={s} /></span
			>
		</button>
	{/each}
</div>

<style>
	.vorrat {
		display: grid;
		gap: 0.5rem;
	}
	.knopf {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 4.5rem;
		border-radius: 0.75rem;
		background: white;
		box-shadow: 0 2px 0 rgb(0 0 0 / 0.15);
		touch-action: none;
	}
	.knopf:disabled {
		opacity: 0.4;
	}
	.knopf:active:not(:disabled) {
		transform: translateY(2px);
		box-shadow: none;
	}
	.bild {
		display: block;
	}
</style>
