<script lang="ts" generics="T">
	/** Zwei bis vier große Felder; ein Tipp genügt. */
	interface Props {
		optionen: { wert: T; text: string; unter?: string; farbe?: string }[];
		onwahl: (wert: T) => void;
		gewaehlt?: T | null;
		gesperrt?: boolean;
	}
	let { optionen, onwahl, gewaehlt = null, gesperrt = false }: Props = $props();
</script>

<div
	class="grid gap-3 {optionen.length > 2 ? 'grid-cols-2' : 'grid-cols-2'}"
	role="group"
	aria-label="Auswahl"
>
	{#each optionen as o, i (i)}
		<button
			type="button"
			class="karte {gewaehlt === o.wert ? 'gewaehlt' : ''}"
			disabled={gesperrt}
			onclick={() => onwahl(o.wert)}
			aria-label={o.unter ? `${o.text} ${o.unter}` : o.text}
		>
			<span class="text-3xl font-bold tabular-nums" style:color={o.farbe}>{o.text}</span>
			{#if o.unter}<span class="text-base text-slate-600">{o.unter}</span>{/if}
		</button>
	{/each}
</div>

<style>
	.karte {
		display: flex;
		min-height: 5.5rem;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		border-radius: 1rem;
		background: white;
		box-shadow: 0 2px 0 rgb(0 0 0 / 0.15);
		touch-action: manipulation;
	}
	.karte:active:not(:disabled) {
		transform: translateY(2px);
		box-shadow: none;
	}
	.karte.gewaehlt {
		outline: 4px solid #0369a1;
	}
</style>
