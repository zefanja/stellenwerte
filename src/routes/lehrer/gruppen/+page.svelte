<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	let { data, form } = $props();
</script>

<svelte:head><title>Gruppen</title></svelte:head>

<main class="mx-auto max-w-5xl px-4 py-8">
	<h1 class="mb-6 text-2xl font-semibold">Gruppen</h1>

	{#if data.groups.length === 0}
		<p class="mb-6 text-slate-600">Noch keine Gruppe angelegt.</p>
	{:else}
		<ul class="mb-8 divide-y divide-slate-200 rounded border border-slate-200 bg-white">
			{#each data.groups as g (g.id)}
				<li>
					<a
						href={resolve('/lehrer/gruppen/[id]', { id: g.id })}
						class="flex items-center gap-4 px-4 py-3 hover:bg-slate-50"
					>
						<span class="font-medium">{g.name}</span>
						<span class="text-sm text-slate-500"
							>{g.students} Schüler · bis Woche {g.activeTrack}</span
						>
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	<form method="POST" action="?/create" use:enhance class="flex max-w-md items-end gap-2">
		<label class="flex flex-1 flex-col gap-1">
			<span class="text-sm">Neue Gruppe</span>
			<input name="name" required maxlength="80" placeholder="z. B. Förderkurs 6a" class="input" />
		</label>
		<button class="btn-primary">Anlegen</button>
	</form>
	{#if form?.message}<p class="mt-2 text-red-700" role="alert">{form.message}</p>{/if}
</main>
