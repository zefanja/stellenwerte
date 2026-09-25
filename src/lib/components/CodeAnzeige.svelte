<script lang="ts">
	/** Sechs Felder in zwei Dreiergruppen, wie auf der Codekarte (123 456). */
	let { code, wackeln = false }: { code: string; wackeln?: boolean } = $props();
	const felder = $derived(Array.from({ length: 6 }, (_, i) => code[i] ?? ''));
</script>

<div
	class="flex justify-center gap-5"
	class:wackeln
	aria-label="Eingegebener Code"
	aria-live="polite"
>
	{#each [0, 3] as start (start)}
		<div class="flex gap-1.5">
			{#each felder.slice(start, start + 3) as z, i (i)}
				<span
					class="flex h-14 w-11 items-center justify-center rounded-lg border-2 bg-white font-mono text-4xl font-semibold
						{z ? 'border-slate-500' : 'border-slate-300'}">{z}</span
				>
			{/each}
		</div>
	{/each}
</div>

<style>
	.wackeln {
		animation: wackeln 400ms ease-in-out;
	}
	@keyframes wackeln {
		20%,
		60% {
			transform: translateX(-8px);
		}
		40%,
		80% {
			transform: translateX(8px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.wackeln {
			animation: none;
		}
	}
</style>
