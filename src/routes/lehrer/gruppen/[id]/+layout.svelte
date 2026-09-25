<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	let { data, children } = $props();
	const tabs = $derived([
		{ href: resolve('/lehrer/gruppen/[id]', { id: data.gruppe.id }), text: 'Übersicht' },
		{ href: resolve('/lehrer/gruppen/[id]/verwaltung', { id: data.gruppe.id }), text: 'Verwaltung' }
	]);
</script>

<main class="mx-auto max-w-6xl px-4 py-6">
	<a href={resolve('/lehrer/gruppen')} class="text-sm text-slate-500 hover:text-slate-900"
		>← Alle Gruppen</a
	>
	<div class="mt-1 mb-4 flex items-end gap-6 border-b border-slate-200">
		<h1 class="pb-2 text-2xl font-semibold">{data.gruppe.name}</h1>
		<nav class="flex gap-1">
			{#each tabs as t (t.href)}
				<a
					href={t.href}
					class="rounded-t px-3 py-2 {page.url.pathname === t.href
						? 'border-b-2 border-slate-800 font-semibold'
						: 'text-slate-500 hover:text-slate-900'}"
					aria-current={page.url.pathname === t.href ? 'page' : undefined}>{t.text}</a
				>
			{/each}
		</nav>
	</div>
	{@render children()}
</main>
