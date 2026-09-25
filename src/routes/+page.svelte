<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { einstellungen, ladeEinstellungen, setzeAnimationen } from '$lib/einstellungen.svelte';
	import { postausgang } from '$lib/postausgang';
	import { loescheSitzung } from '$lib/sitzung';
	let { data } = $props();

	/** Antworten, die noch auf dem Gerät warten (offline geübt) */
	let offen = $state(0);

	onMount(() => {
		ladeEinstellungen();
		offen = postausgang.anzahl;
		postausgang.leeren().then(() => (offen = postausgang.anzahl));
	});

	async function abmelden() {
		// erst senden, was noch wartet; danach gehört das Gerät dem nächsten Kind
		await postausgang.leeren(5000);
		loescheSitzung();
		await caches?.delete('seiten-v1').catch(() => {});
		await fetch('/api/logout', { method: 'POST' });
		await goto(resolve('/login'), { replaceState: true, invalidateAll: true });
	}
</script>

<svelte:head><title>Stellenwerttraining</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6">
	<section class="flex flex-1 flex-col items-center justify-center gap-2 text-center">
		<p class="text-2xl">Hallo</p>
		<p class="text-5xl font-bold break-words" data-testid="begruessung">{data.label}</p>
		{#if offen > 0}
			<p class="mt-4 text-slate-600" data-testid="noch-offen">
				{offen} Antworten warten auf Internet.
			</p>
		{/if}
	</section>
	<div class="flex flex-col gap-3">
		<a
			href={resolve('/ueben')}
			class="flex min-h-24 items-center justify-center rounded-2xl bg-emerald-600 text-3xl font-semibold text-white shadow"
		>
			Los geht's
		</a>
		<button
			type="button"
			class="flex min-h-12 items-center justify-center gap-2 rounded-xl text-slate-600"
			aria-pressed={einstellungen.animationen}
			onclick={() => setzeAnimationen(!einstellungen.animationen)}
		>
			Bewegung: <strong>{einstellungen.animationen ? 'an' : 'aus'}</strong>
		</button>
		<button
			type="button"
			class="min-h-11 self-center px-4 text-slate-600 underline"
			onclick={abmelden}>Nicht du? Abmelden</button
		>
	</div>
</main>
