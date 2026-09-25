<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	let { data } = $props();

	async function abmelden() {
		await fetch('/api/logout', { method: 'POST' });
		await goto(resolve('/login'), { replaceState: true, invalidateAll: true });
	}
</script>

<svelte:head><title>Stellenwerttraining</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6">
	<section class="flex flex-1 flex-col items-center justify-center gap-2 text-center">
		<p class="text-2xl">Hallo</p>
		<p class="text-5xl font-bold break-words" data-testid="begruessung">{data.label}</p>
	</section>
	<div class="flex flex-col gap-3">
		<button
			type="button"
			class="min-h-24 rounded-2xl bg-slate-300 text-2xl font-semibold text-slate-600"
			disabled
		>
			Üben kommt bald
		</button>
		<button
			type="button"
			class="min-h-11 self-center px-4 text-slate-600 underline"
			onclick={abmelden}
		>
			Nicht du? Abmelden
		</button>
	</div>
</main>
