<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { SubmitFunction } from '@sveltejs/kit';
	let { data, form } = $props();

	const formatCode = (c: string) => `${c.slice(0, 3)} ${c.slice(3)}`;
	/** Rückfrage vor Aktionen, die sich nicht rückgängig machen lassen */
	const nachfragen =
		(frage: string): SubmitFunction =>
		({ cancel }) => {
			if (!confirm(frage)) cancel();
		};
</script>

<svelte:head><title>{data.group.name} – Verwaltung</title></svelte:head>

{#if form?.message}<p class="mb-4 rounded bg-slate-100 p-3" role="status">{form.message}</p>{/if}

{#if form && 'newCodes' in form && form.newCodes}
	<section class="mb-8 rounded border-2 border-amber-400 bg-amber-50 p-4" data-testid="neue-codes">
		<h2 class="font-semibold">Neue Codes – nur jetzt sichtbar</h2>
		<p class="mb-3 text-sm text-slate-700">
			Gespeichert wird nur ein Hash. Das Druck-PDF steht 15 Minuten bereit; danach lassen sich die
			Codes nur neu erzeugen. Alte Codes dieser Schüler gelten ab sofort nicht mehr.
		</p>
		<a
			class="btn-primary mb-4 inline-block"
			href={resolve('/lehrer/codes/[token]', { token: form.pdfToken })}
			data-testid="pdf-link">Codekarten als PDF (8 pro A4-Seite)</a
		>
		<table class="text-left">
			<tbody>
				{#each form.newCodes as c (c.code)}
					<tr
						><td class="pr-8">{c.label}</td><td
							class="font-mono text-xl tracking-wider"
							data-testid="code">{formatCode(c.code)}</td
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
					<li data-schueler={s.label}>
						<details class="group px-4 py-2">
							<summary class="flex cursor-pointer items-center gap-2">
								<span class="flex-1">{s.label}</span>
								<span class="text-sm text-slate-500 group-open:hidden">Aktionen</span>
							</summary>
							<div class="mt-3 flex flex-col gap-3 pb-2 text-sm">
								<div class="flex flex-wrap gap-2">
									<form
										method="POST"
										action="?/codes"
										use:enhance={nachfragen(
											`Neuen Code für ${s.label} erzeugen? Der alte gilt dann nicht mehr.`
										)}
									>
										<input type="hidden" name="student" value={s.id} />
										<button class="btn-secondary py-1">Neuer Code</button>
									</form>
									<a
										class="btn-secondary py-1"
										href={resolve('/api/teacher/schueler/[id]/export.json', { id: s.id })}
										download>Daten (JSON)</a
									>
									<a
										class="btn-secondary py-1"
										href={resolve('/lehrer/schueler/[id]', { id: s.id })}>Profil</a
									>
								</div>
								{#if data.andereGruppen.length > 0}
									<form method="POST" action="?/move" use:enhance class="flex items-center gap-2">
										<input type="hidden" name="student" value={s.id} />
										<select name="ziel" class="input py-1" aria-label="Zielgruppe für {s.label}">
											{#each data.andereGruppen as g (g.id)}<option value={g.id}>{g.name}</option
												>{/each}
										</select>
										<button class="btn-secondary py-1">Verschieben</button>
									</form>
								{/if}
								<form
									method="POST"
									action="?/archive"
									use:enhance={nachfragen(
										`${s.label} archivieren? Code und Kürzel werden entfernt.`
									)}
									class="flex flex-wrap items-center gap-3"
								>
									<input type="hidden" name="student" value={s.id} />
									<label class="flex items-center gap-1"
										><input type="radio" name="daten" value="behalten" checked /> Lernstand anonym behalten</label
									>
									<label class="flex items-center gap-1"
										><input type="radio" name="daten" value="loeschen" /> alles löschen</label
									>
									<button class="btn-secondary py-1">Archivieren</button>
								</form>
								<form
									method="POST"
									action="?/reset"
									use:enhance={nachfragen(
										`Lernstand von ${s.label} zurücksetzen? Alle Antworten und der Fortschritt werden gelöscht, Kürzel und Code bleiben.`
									)}
								>
									<input type="hidden" name="student" value={s.id} />
									<button
										class="rounded border border-red-300 bg-white px-4 py-1 text-red-700 hover:bg-red-50"
										>Lernstand zurücksetzen</button
									>
								</form>
								<form
									method="POST"
									action="?/delete"
									use:enhance={nachfragen(`${s.label} mit allen Daten endgültig löschen?`)}
								>
									<input type="hidden" name="student" value={s.id} />
									<button
										class="rounded border border-red-300 bg-white px-4 py-1 text-red-700 hover:bg-red-50"
										>Löschen</button
									>
								</form>
							</div>
						</details>
					</li>
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

		<form
			method="POST"
			action="?/codes"
			use:enhance={nachfragen(
				'Für alle Schüler der Gruppe neue Codes erzeugen? Alle alten Codes gelten dann nicht mehr.'
			)}
		>
			<span class="block font-semibold">Codekarten</span>
			<span class="mb-2 block text-sm text-slate-600"
				>Neue Codes für die ganze Gruppe, danach als PDF drucken.</span
			>
			<button class="btn-secondary">Alle Codes neu erzeugen</button>
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

		<form
			method="POST"
			action="?/archive"
			use:enhance={nachfragen(
				'Alle Schüler dieser Gruppe archivieren? Ihre Codes gelten dann nicht mehr.'
			)}
			class="rounded border border-slate-200 p-3"
		>
			<span class="block font-semibold">Schuljahresende</span>
			<span class="mb-2 block text-sm text-slate-600"
				>Alle Schüler archivieren: Codes und Kürzel werden entfernt.</span
			>
			<label class="flex items-center gap-1 text-sm"
				><input type="radio" name="daten" value="behalten" checked /> Lernstand anonymisiert für die Statistik
				behalten</label
			>
			<label class="mb-2 flex items-center gap-1 text-sm"
				><input type="radio" name="daten" value="loeschen" /> alle Daten löschen</label
			>
			<button class="btn-secondary">Alle archivieren</button>
		</form>
	</section>
</div>
