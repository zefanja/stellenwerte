<script lang="ts">
	/** Großer Weiter-Knopf nach der Lösungsanimation */
	let { bereit, onweiter }: { bereit: boolean; onweiter: () => void } = $props();
</script>

<button
	type="button"
	class="min-h-20 w-full rounded-2xl bg-slate-800 text-2xl font-semibold text-white disabled:opacity-30"
	disabled={!bereit}
	onclick={onweiter}
>
	Weiter
</button>
