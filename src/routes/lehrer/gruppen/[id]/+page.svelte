<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	let { data, form } = $props();

	const formatCode = (c: string) => `${c.slice(0, 3)} ${c.slice(3)}`;
</script>

<svelte:head><title>{data.group.name}</title></svelte:head>

<main class="mx-auto max-w-5xl px-4 py-8">
	<a href={resolve('/lehrer/gruppen')} class="text-sm text-slate-500 hover:text-slate-900">← Alle Gruppen</a>
	<h1 class="mt-2 mb-6 text-2xl font-semibold">{data.group.name}</h1>

	{#if form?.message}<p class="mb-4 text-red-700" role="alert">{form.message}</p>{/if}

	{#if form?.newCodes}
		<section class="mb-8 rounded border-2 border-amber-400 bg-amber-50 p-4">
			<h2 class="font-semibold">Neue Codes – nur jetzt sichtbar</h2>
			<p class="mb-3 text-sm text-slate-700">
				Bitte jetzt notieren oder drucken. Gespeichert wird nur ein Hash; die Codes lassen sich
				später nicht mehr anzeigen, nur neu erzeugen.
			</p>
			<table class="text-left">
				<tbody>
					{#each form.newCodes as c (c.code)}
						<tr
							><td class="pr-8">{c.label}</td><td class="font-mono text-xl tracking-wider"
								>{formatCode(c.code)}</td
							></tr
						>
					{/each}
				</tbody>
			</table>
		</section>
	{/if}

	<div class="grid gap-8 md:grid-cols-2">
		<section>
			<h2 class="mb-3 text-lg font-semibold">Schüler ({data.students.length})</h2>
			{#if data.students.length === 0}
				<p class="text-slate-600">Noch keine Schüler.</p>
			{:else}
				<ul class="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
					{#each data.students as s (s.id)}
						<li class="px-4 py-2">{s.label}</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="flex flex-col gap-8">
			<form method="POST" action="?/addStudents" use:enhance class="flex flex-col gap-2">
				<label class="flex flex-col gap-1">
					<span class="font-semibold">Schüler hinzufügen</span>
					<span class="text-sm text-slate-600"
						>Ein Kürzel pro Zeile, z. B. „L. M.“ oder „Schüler 07“. Keine vollen Namen nötig.</span
					>
					<textarea name="labels" rows="6" class="input font-mono"></textarea>
				</label>
				<button class="btn-primary self-start">Anlegen und Codes erzeugen</button>
			</form>

			<form method="POST" action="?/rename" use:enhance class="flex items-end gap-2">
				<label class="flex flex-1 flex-col gap-1">
					<span class="font-semibold">Gruppe umbenennen</span>
					<input name="name" required maxlength="80" value={data.group.name} class="input" />
				</label>
				<button class="btn-secondary">Speichern</button>
			</form>

			<form method="POST" action="?/track" use:enhance class="flex items-end gap-2">
				<label class="flex flex-1 flex-col gap-1">
					<span class="font-semibold">Freigegeben bis Woche</span>
					<select name="activeTrack" class="input" value={data.group.activeTrack}>
						{#each [1, 2, 3, 4, 5, 6] as w (w)}<option value={w}>Woche {w}</option>{/each}
					</select>
				</label>
				<button class="btn-secondary">Speichern</button>
			</form>
		</section>
	</div>
</main>
