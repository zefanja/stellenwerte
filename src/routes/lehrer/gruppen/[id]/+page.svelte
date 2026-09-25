<script lang="ts">
	import { resolve } from '$app/paths';
	import { datumKurz } from '$lib/components/Datum';
	import StatusZelle from '$lib/components/StatusZelle.svelte';
	import { STATUS_TEXT, type ZellStatus } from '$lib/dashboard/regeln';
	let { data } = $props();

	const zahl = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
	const titel = (z: {
		status: ZellStatus;
		stability: number | null;
		due: Date | null;
		againInFolge: number;
	}) =>
		[
			STATUS_TEXT[z.status],
			z.stability !== null ? `Stabilität ${zahl(z.stability)} Tage` : null,
			z.due && z.status !== 'grau' ? `fällig ${datumKurz(z.due)}` : null,
			z.againInFolge > 0 ? `${z.againInFolge}× Again in Folge` : null
		]
			.filter(Boolean)
			.join(' · ');
	const hier = $derived(resolve('/lehrer/gruppen/[id]', { id: data.gruppe.id }));
</script>

<svelte:head><title>{data.gruppe.name} – Übersicht</title></svelte:head>

<h2 class="mb-3 text-lg text-slate-600">Wer braucht diese Woche Aufmerksamkeit?</h2>

<section class="mb-5 grid max-w-3xl grid-cols-3 gap-3" aria-label="Kennzahlen">
	<div class="rounded border border-slate-200 bg-white p-3">
		<div class="text-2xl font-semibold" data-testid="aktiv7">
			{data.kennzahlen.aktiv7} von {data.kennzahlen.schueler}
		</div>
		<div class="text-sm text-slate-600">aktiv in den letzten 7 Tagen</div>
	</div>
	<div class="rounded border border-slate-200 bg-white p-3">
		<div class="text-2xl font-semibold" data-testid="median">
			{zahl(data.kennzahlen.medianSessions)}
		</div>
		<div class="text-sm text-slate-600">Sessions pro Kind (Median, 7 Tage)</div>
	</div>
	<div class="rounded border border-slate-200 bg-white p-3">
		<div
			class="text-2xl font-semibold {data.kennzahlen.rot > 0 ? 'text-red-700' : ''}"
			data-testid="rot"
		>
			{data.kennzahlen.rot}
		</div>
		<div class="text-sm text-slate-600">rote Felder</div>
	</div>
</section>

{#if data.zeilen.length === 0}
	<p class="text-slate-600">
		Noch keine Schüler. <a
			class="underline"
			href={resolve('/lehrer/gruppen/[id]/verwaltung', { id: data.gruppe.id })}>Schüler anlegen</a
		>
	</p>
{:else}
	<div class="mb-2 flex flex-wrap items-center gap-4 text-sm">
		<span class="text-slate-600">Sortieren:</span>
		<a href={hier} class={data.sortierung === 'name' ? 'font-semibold' : 'text-slate-600 underline'}
			>nach Name</a
		>
		<a
			href="{hier}?sort=rot"
			class={data.sortierung === 'rot' ? 'font-semibold' : 'text-slate-600 underline'}
			>meiste rote Felder zuerst</a
		>
		<span class="ml-auto flex gap-3">
			<a
				class="btn-secondary py-1 text-sm"
				href={resolve('/api/teacher/gruppen/[id]/[datei]', {
					id: data.gruppe.id,
					datei: 'stand.csv'
				})}
				download>CSV: Stand</a
			>
			<a
				class="btn-secondary py-1 text-sm"
				href={resolve('/api/teacher/gruppen/[id]/[datei]', {
					id: data.gruppe.id,
					datei: 'fehler.csv'
				})}
				download>CSV: Fehlertypen</a
			>
		</span>
	</div>

	<div class="overflow-x-auto rounded border border-slate-200 bg-white">
		<table class="w-full text-sm" data-testid="matrix">
			<thead>
				<tr class="border-b border-slate-200 align-bottom">
					<th class="sticky left-0 bg-white px-3 py-2 text-left">Schüler</th>
					{#each data.skills as s (s.id)}
						<th
							class="w-20 px-1 py-2 text-center text-xs font-medium {s.woche >
							data.gruppe.activeTrack
								? 'text-slate-400'
								: ''}"
							title="Woche {s.woche}"
						>
							{s.titel}
						</th>
					{/each}
					<th class="px-2 py-2 text-right text-xs font-medium">Sessions 7 T.</th>
					<th class="px-3 py-2 text-right text-xs font-medium">zuletzt</th>
				</tr>
			</thead>
			<tbody>
				{#each data.zeilen as z (z.id)}
					<tr
						class="border-b border-slate-100 last:border-0 hover:bg-slate-50"
						data-schueler={z.label}
					>
						<td class="sticky left-0 bg-white px-3 py-1.5">
							<a
								class="font-medium underline-offset-2 hover:underline"
								href={resolve('/lehrer/schueler/[id]', { id: z.id })}>{z.label}</a
							>
						</td>
						{#each data.skills as s (s.id)}
							<td class="px-1 py-1.5 text-center" data-skill={s.id}>
								<StatusZelle
									status={z.zellen[s.id].status}
									titel="{z.label}, {s.titel}: {titel(z.zellen[s.id])}"
								/>
							</td>
						{/each}
						<td
							class="px-2 py-1.5 text-right tabular-nums {z.sessions7 === 0 ? 'text-red-700' : ''}"
							>{z.sessions7}</td
						>
						<td class="px-3 py-1.5 text-right text-slate-600 tabular-nums"
							>{datumKurz(z.zuletzt)}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
		{#each ['grau', 'gelb', 'gruen', 'rot'] as const as st (st)}
			<span class="flex items-center gap-1.5"
				><StatusZelle status={st} titel={STATUS_TEXT[st]} /> {STATUS_TEXT[st]}</span
			>
		{/each}
		<span>Grün: Stabilität über 21 Tage. Rot: mindestens zweimal Again in Folge.</span>
	</div>

	{#if data.fehlerbilder.length > 0}
		<section class="mt-6 max-w-3xl">
			<h3 class="mb-2 font-semibold">Häufigste Fehlerbilder der Gruppe (28 Tage)</h3>
			<ul class="space-y-1 text-sm">
				{#each data.fehlerbilder as f (f.tag)}
					<li class="flex gap-3">
						<span class="w-10 text-right tabular-nums">{f.n}×</span><span>{f.text}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}
