<script lang="ts">
	import TeilBild from './TeilBild.svelte';
	import { BEWEGUNG_MS } from './animation';
	import type { Teil } from './modell.svelte';

	/** Ein positioniertes Teil; bewegt wird ausschließlich über transform und opacity. */
	let { teil, trefferRand = 0 }: { teil: Teil; trefferRand?: number } = $props();
</script>

<div
	class="teil"
	class:sofort={teil.sofort}
	class:ausgewaehlt={teil.ausgewaehlt}
	class:leuchtet={teil.leuchtet}
	data-art={teil.art}
	style:width="{teil.b + 2 * trefferRand}px"
	style:height="{teil.h + 2 * trefferRand}px"
	style:padding="{trefferRand}px"
	style:transform="translate({teil.x - trefferRand}px, {teil.y - trefferRand}px) scale({teil.skala})"
	style:opacity={teil.deckkraft}
	style:--dauer="{BEWEGUNG_MS}ms"
>
	<div class="bild">
		<TeilBild art={teil.art} lage={teil.lage} fein={Math.min(teil.b, teil.h) >= 6} />
	</div>
</div>

<style>
	.teil {
		position: absolute;
		left: 0;
		top: 0;
		box-sizing: border-box;
		transition:
			transform var(--dauer) ease-in-out,
			opacity var(--dauer) ease-in-out;
		will-change: transform;
		pointer-events: none;
	}
	.teil.sofort {
		transition: none;
	}
	.bild {
		position: relative;
		width: 100%;
		height: 100%;
	}
	.ausgewaehlt .bild {
		outline: 3px solid #1d4ed8;
		outline-offset: 2px;
		border-radius: 2px;
	}
	/* Aufleuchten über eine Deckschicht, die nur ihre opacity animiert */
	.bild::after {
		content: '';
		position: absolute;
		inset: -3px;
		border-radius: 3px;
		background: white;
		opacity: 0;
		pointer-events: none;
	}
	.leuchtet .bild::after {
		animation: blitz 200ms ease-out;
	}
	@keyframes blitz {
		30% {
			opacity: 0.85;
		}
	}
</style>
