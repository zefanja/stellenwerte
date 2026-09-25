<script lang="ts">
	import type { Stelle } from '$lib/skills/typen';
	import { FARBE } from './farben';
	import { langDruck, ziehbar } from './gesten';
	import { KOPF_HOEHE, ZIFFERN_HOEHE } from './layout';
	import type { TafelModell } from './modell.svelte';
	import TeilSicht from './TeilSicht.svelte';

	interface Props {
		modell: TafelModell;
		/** Spalte antippen (z. B. auswählen oder um eins erhöhen) */
		onspalte?: (s: Stelle) => void;
		/** Spalten sind Ablageziele für den Vorrat */
		ablage?: boolean;
		/** langes Drücken oder Ziehen auf die Tauschfläche entbündelt */
		tauschen?: boolean;
		auswahl?: Stelle | null;
	}

	let { modell, onspalte, ablage = false, tauschen = false, auswahl = null }: Props = $props();

	let breite = $state(0);
	let hoehe = $state(0);
	let feld: HTMLDivElement;

	$effect(() => {
		if (breite > 0 && hoehe > 0) modell.setzeGroesse(breite, hoehe);
	});

	/** Bildschirmpunkt in Feldkoordinaten, z. B. für abgelegtes Material */
	export function lokal(p: { x: number; y: number }) {
		const r = feld.getBoundingClientRect();
		return { x: p.x - r.left, y: p.y - r.top };
	}
</script>

<div
	class="tafel"
	bind:this={feld}
	bind:clientWidth={breite}
	bind:clientHeight={hoehe}
	data-ablage={ablage ? 'tafel' : undefined}
>
	{#if modell.layout}
		{#each modell.layout.spalten as r, i (r.stelle)}
			<div
				class="spalte"
				class:gewaehlt={auswahl === r.stelle}
				class:trenner={i > 0}
				style:left="{r.x}px"
				style:width="{r.breite}px"
				data-spalte={r.stelle}
				{...onspalte ? { role: 'button', tabindex: 0, 'aria-label': `Spalte ${r.stelle}` } : {}}
				onclick={() => onspalte?.(r.stelle)}
				onkeydown={(e) => e.key === 'Enter' && onspalte?.(r.stelle)}
				use:langDruck={() => tauschen && modell.entbuendeln(r.stelle)}
				use:ziehbar={{
					onablegen: (ziel) => tauschen && ziel === 'tausch' && modell.entbuendeln(r.stelle)
				}}
			>
				<div class="kopf" style:height="{KOPF_HOEHE}px" style:color={FARBE[r.stelle].text}>
					{r.stelle}
				</div>
				{#if modell.zaehler === r.stelle}
					<div class="zaehler" style:color={FARBE[r.stelle].text} data-testid="zaehler">
						{modell.anzahl(r.stelle)}
					</div>
				{/if}
				{#if modell.mitZiffernzeile}
					<div class="ziffer" style:height="{ZIFFERN_HOEHE}px" style:color={FARBE[r.stelle].text}>
						{#if modell.ziffern}<span class="erscheint">{modell.ziffern[r.stelle] ?? 0}</span>{/if}
					</div>
				{/if}
			</div>
		{/each}
	{/if}
	{#each modell.teile as t (t.id)}
		<TeilSicht teil={t} />
	{/each}
</div>

<style>
	.tafel {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		border-radius: 0.75rem;
		background: white;
		touch-action: none;
		user-select: none;
	}
	.spalte {
		position: absolute;
		top: 0;
		bottom: 0;
	}
	.spalte.trenner {
		border-left: 2px solid rgb(226 232 240);
	}
	.spalte.gewaehlt {
		background: rgb(219 234 254);
	}
	.kopf {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		font-weight: 700;
		border-bottom: 2px solid rgb(226 232 240);
	}
	.zaehler {
		position: absolute;
		top: 2.25rem;
		left: 0;
		right: 0;
		text-align: center;
		font-size: 2rem;
		font-weight: 700;
		z-index: 2;
	}
	.ziffer {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-top: 2px solid rgb(226 232 240);
		font-size: 2.25rem;
		font-weight: 700;
	}
	.erscheint {
		animation: erscheinen 250ms ease-out;
	}
	@keyframes erscheinen {
		from {
			opacity: 0;
			transform: scale(0.5);
		}
	}
</style>
