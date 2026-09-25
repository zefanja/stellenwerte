<script lang="ts">
	import type { Schrittfolge } from './schritte.svelte';
	import Vorlesen from './Vorlesen.svelte';

	/**
	 * Großer Knopf nach der Lösungsanimation. Im Beispiel („Schau zu“) zeigt er vorher jeden
	 * Schritt mit einem Satz und geht erst nach einem Tipp auf „Nächster Schritt“ weiter.
	 */
	interface Props {
		bereit: boolean;
		onweiter: () => void;
		schritte?: Schrittfolge;
	}
	let { bereit, onweiter, schritte }: Props = $props();
</script>

{#if schritte?.text}
	<div class="flex items-center gap-3 rounded-xl bg-sky-50 p-3" aria-live="polite">
		<Vorlesen text={schritte.text} />
		<p class="text-xl font-semibold text-sky-900" data-testid="schritt-text">{schritte.text}</p>
	</div>
{/if}
<!-- im Beispiel bleibt „Nächster Schritt“ stehen, gesperrt solange ein Schritt läuft: kein Flackern -->
{#if schritte && !bereit}
	<button
		type="button"
		class="min-h-20 w-full rounded-2xl bg-sky-600 text-2xl font-semibold text-white disabled:opacity-40"
		disabled={!schritte.wartet}
		onclick={() => schritte.weiter()}
	>
		Nächster Schritt
	</button>
{:else}
	<button
		type="button"
		class="min-h-20 w-full rounded-2xl bg-slate-800 text-2xl font-semibold text-white disabled:opacity-30"
		disabled={!bereit}
		onclick={onweiter}
	>
		Weiter
	</button>
{/if}
