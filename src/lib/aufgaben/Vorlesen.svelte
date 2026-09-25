<script lang="ts">
	import { onMount } from 'svelte';

	/** Lautsprecher-Knopf: liest Text mit der deutschen Systemstimme vor, falls vorhanden. */
	let { text }: { text: string } = $props();
	let moeglich = $state(false);

	onMount(() => {
		moeglich = 'speechSynthesis' in window;
	});

	function vorlesen() {
		speechSynthesis.cancel();
		const a = new SpeechSynthesisUtterance(text);
		a.lang = 'de-DE';
		a.rate = 0.9;
		speechSynthesis.speak(a);
	}
</script>

{#if moeglich}
	<button
		type="button"
		class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow"
		aria-label="Vorlesen"
		onclick={vorlesen}
	>
		<svg
			viewBox="0 0 24 24"
			class="h-6 w-6"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
		</svg>
	</button>
{/if}
