<script lang="ts">
	/** Zeigt die bisher getippte Zahl über dem Ziffernblock, mit Tausenderlücke (4 090). */
	let { wert }: { wert: string } = $props();
	const gruppiert = $derived(wert.replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
</script>

<div
	class="flex h-14 items-center justify-center rounded-xl border-2 border-slate-300 bg-white font-mono text-4xl font-semibold"
	data-testid="antwort"
	aria-live="polite"
>
	{gruppiert}
</div>
