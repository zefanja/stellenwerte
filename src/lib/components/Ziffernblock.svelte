<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * Großer Ziffernblock statt Systemtastatur: 0–9, Löschen, Bestätigen, drei Spalten,
	 * Tasten mindestens 56 px hoch, 8 px Abstand. Für eine Hand im Hochformat.
	 */
	interface Props {
		wert: string;
		maxLaenge: number;
		/** Bestätigen erst möglich, wenn true; Standard: sobald etwas eingegeben ist */
		bereit?: boolean;
		gesperrt?: boolean;
		onbestaetigen: () => void;
	}

	let { wert = $bindable(), maxLaenge, bereit, gesperrt = false, onbestaetigen }: Props = $props();
	const kannBestaetigen = $derived(bereit ?? wert.length > 0);

	// Bis der Block interaktiv ist, bleibt er gesperrt: Auf langsamen Handys gingen Tipps vor
	// dem Laden des JavaScripts sonst stillschweigend verloren.
	let interaktiv = $state(false);
	onMount(() => (interaktiv = true));
	const aus = $derived(gesperrt || !interaktiv);

	function tippe(ziffer: string) {
		if (!aus && wert.length < maxLaenge) wert += ziffer;
	}

	function loesche() {
		if (!aus) wert = wert.slice(0, -1);
	}

	function bestaetige() {
		if (!aus && kannBestaetigen) onbestaetigen();
	}

	// Physische Tastatur nur als Komfort am Rechner; es gibt kein Eingabefeld.
	function onkeydown(e: KeyboardEvent) {
		if (/^\d$/.test(e.key)) tippe(e.key);
		else if (e.key === 'Backspace') loesche();
		else if (e.key === 'Enter') bestaetige();
		else return;
		e.preventDefault();
	}
</script>

<svelte:window {onkeydown} />

<div class="grid grid-cols-3 gap-2 select-none" role="group" aria-label="Ziffernblock">
	{#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as z (z)}
		<button type="button" class="taste" disabled={aus} onclick={() => tippe(z)}>{z}</button>
	{/each}
	<button
		type="button"
		class="taste text-slate-600"
		disabled={aus}
		onclick={loesche}
		aria-label="Löschen"
	>
		<svg
			viewBox="0 0 24 24"
			class="mx-auto h-8 w-8"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" /><path d="m17 9-6 6M11 9l6 6" />
		</svg>
	</button>
	<button type="button" class="taste" disabled={aus} onclick={() => tippe('0')}>0</button>
	<button
		type="button"
		class="taste taste-ok"
		disabled={aus || !kannBestaetigen}
		onclick={bestaetige}
		aria-label="Bestätigen"
	>
		<svg
			viewBox="0 0 24 24"
			class="mx-auto h-9 w-9"
			fill="none"
			stroke="currentColor"
			stroke-width="3"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="m5 12 5 5L20 7" />
		</svg>
	</button>
</div>

<style>
	.taste {
		min-height: 3.75rem; /* 60 px, Spezifikation: mindestens 56 px */
		border-radius: 0.75rem;
		background: white;
		font-size: 2rem;
		font-weight: 600;
		box-shadow: 0 2px 0 rgb(0 0 0 / 0.15);
		touch-action: manipulation;
	}
	.taste:active:not(:disabled) {
		transform: translateY(2px);
		box-shadow: none;
		background: rgb(226 232 240);
	}
	.taste:disabled {
		opacity: 0.4;
	}
	.taste-ok {
		background: rgb(5 150 105);
		color: white;
	}
	.taste-ok:active:not(:disabled) {
		background: rgb(4 120 87);
	}
</style>
