<script lang="ts">
	import { onMount } from 'svelte';

	/**
	 * Lautsprecher-Knopf: liest Text mit einer deutschen Stimme des Geräts vor. Erscheint nur, wenn
	 * das Gerät eine hat (Android und iOS ja, Linux-Desktops oft nicht); ein Knopf, der nichts tut,
	 * verwirrt mehr als keiner. Zweiter Tipp während des Vorlesens stoppt.
	 */
	let { text }: { text: string } = $props();
	let stimme = $state<SpeechSynthesisVoice | null>(null);
	let spricht = $state(false);

	onMount(() => {
		if (!('speechSynthesis' in window)) return;
		// Stimmen laden in Chrome verzögert; erst nach „voiceschanged“ ist die Liste vollständig
		const waehle = () => {
			const alle = speechSynthesis.getVoices();
			stimme =
				alle.find((v) => v.lang === 'de-DE') ??
				alle.find((v) => v.lang.toLowerCase().startsWith('de')) ??
				null;
		};
		waehle();
		speechSynthesis.addEventListener('voiceschanged', waehle);
		return () => {
			speechSynthesis.removeEventListener('voiceschanged', waehle);
			if (spricht) speechSynthesis.cancel();
		};
	});

	/** Chrome räumt Äußerungen ohne Referenz vorzeitig ab und verstummt dann mitten im Satz */
	let aktuell: SpeechSynthesisUtterance | null = null;

	function vorlesen() {
		if (!stimme) return;
		if (spricht) {
			speechSynthesis.cancel();
			spricht = false;
			return;
		}
		const a = new SpeechSynthesisUtterance(text);
		a.voice = stimme;
		a.lang = stimme.lang;
		a.rate = 0.9;
		a.onend = a.onerror = () => (spricht = false);
		aktuell = a;
		speechSynthesis.cancel();
		speechSynthesis.speak(aktuell);
		spricht = true;
	}
</script>

{#if stimme}
	<button
		type="button"
		class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow {spricht
			? 'bg-sky-600 text-white'
			: 'bg-white'}"
		aria-label={spricht ? 'Vorlesen stoppen' : 'Vorlesen'}
		aria-pressed={spricht}
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
			<path d="M11 5 6 9H2v6h4l5 4V5Z" /><path
				d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"
				class={spricht ? 'wellen' : ''}
			/>
		</svg>
	</button>
{/if}

<style>
	.wellen {
		animation: puls 900ms ease-in-out infinite;
	}
	@keyframes puls {
		50% {
			opacity: 0.3;
		}
	}
</style>
