<script lang="ts">
	import { resolve } from '$app/paths';
	import { datumKurz } from '$lib/components/Datum';
	import StatusZelle from '$lib/components/StatusZelle.svelte';
	import { STATUS_TEXT } from '$lib/dashboard/regeln';
	let { data } = $props();

	const sessions7 = $derived(
		data.zeitachse.slice(-7 - ((new Date().getDay() + 6) % 7)).reduce((n, t) => n + t.sessions, 0)
	);
	const farbe = (t: { aufgaben: number; richtig: number; zukunft: boolean }) => {
		if (t.zukunft) return 'bg-transparent';
		if (t.aufgaben === 0) return 'bg-slate-200';
		const quote = t.richtig / t.aufgaben;
		return quote >= 0.8 ? 'bg-emerald-500' : quote >= 0.5 ? 'bg-emerald-300' : 'bg-amber-300';
	};
	const tagText = (tag: string) => tag.slice(8, 10) + '.' + tag.slice(5, 7) + '.';
	const uhrzeit = new Intl.DateTimeFormat('de-DE', {
		timeZone: 'Europe/Berlin',
		day: 'numeric',
		month: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
</script>

<svelte:head><title>{data.schueler.label} – Profil</title></svelte:head>

<main class="mx-auto max-w-6xl px-4 py-3">
	<a
		href={resolve('/lehrer/gruppen/[id]', { id: data.schueler.groupId })}
		class="text-sm text-slate-500 hover:text-slate-900">← {data.schueler.gruppe}</a
	>
	<h1 class="mb-3 text-2xl font-semibold">{data.schueler.label}</h1>

	<div class="grid grid-cols-12 gap-6">
		<div class="col-span-5 flex flex-col gap-4">
			<section aria-label="Zeitachse">
				<h2 class="mb-2 font-semibold">Übungstage (6 Wochen)</h2>
				<div class="flex gap-2">
					<div class="grid grid-rows-7 gap-1 text-xs leading-4 text-slate-500">
						{#each ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as w (w)}<span class="h-4">{w}</span
							>{/each}
					</div>
					<div class="grid grid-flow-col grid-rows-7 gap-1" data-testid="zeitachse">
						{#each data.zeitachse as t (t.tag)}
							<span
								class="h-4 w-4 rounded-sm {farbe(t)}"
								data-geuebt={t.aufgaben > 0}
								title={t.zukunft
									? ''
									: t.aufgaben
										? `${tagText(t.tag)}: ${t.aufgaben} Aufgaben, ${t.richtig} beim ersten Mal richtig`
										: `${tagText(t.tag)}: nicht geübt`}
							></span>
						{/each}
					</div>
				</div>
				<p class="mt-2 text-sm text-slate-600">
					Diese Woche {sessions7}
					{sessions7 === 1 ? 'Session' : 'Sessions'}.
				</p>
			</section>

			<section aria-label="Skills">
				<h2 class="mb-2 font-semibold">Skills</h2>
				<table class="w-full text-sm">
					<tbody>
						{#each data.skills as s (s.id)}
							<tr class="border-b border-slate-100 last:border-0" data-skill={s.id}>
								<td class="py-0.5"
									><StatusZelle klein status={s.status} titel={STATUS_TEXT[s.status]} /></td
								>
								<td class="py-0.5 pl-2">{s.titel}</td>
								<td class="py-0.5 text-right text-slate-600 tabular-nums">
									{#if s.einfuehrung}in Einführung{:else if s.due}nächste Wiederholung {datumKurz(
											s.due
										)}{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</section>
		</div>

		<div class="col-span-7 flex flex-col gap-4">
			<section aria-label="Häufigste Fehler">
				<h2 class="mb-2 font-semibold">Häufigste Fehler (4 Wochen)</h2>
				{#if data.haeufigsteFehler.length === 0}
					<p class="text-sm text-slate-600">Keine Fehler in den letzten vier Wochen.</p>
				{:else}
					<ol class="space-y-1" data-testid="haeufigste-fehler">
						{#each data.haeufigsteFehler as f (f.tag)}
							<li class="text-sm">
								<p>
									<strong class="font-medium">{f.text}</strong>, {f.n} von {data.fehlerGesamt} Fehlern
								</p>
								<span class="mt-0.5 block h-1.5 rounded bg-red-200"
									><span
										class="block h-1.5 rounded bg-red-600"
										style:width="{(100 * f.n) / data.fehlerGesamt}%"
									></span></span
								>
							</li>
						{/each}
					</ol>
				{/if}
			</section>

			<section aria-label="Letzte Fehlversuche">
				<h2 class="mb-2 font-semibold">Letzte Fehlversuche</h2>
				{#if data.letzteFehler.length === 0}
					<p class="text-sm text-slate-600">Noch keine.</p>
				{:else}
					<table class="w-full table-fixed text-sm" data-testid="letzte-fehler">
						<thead>
							<tr class="border-b border-slate-200 text-left text-xs text-slate-500">
								<th class="w-24 py-1 font-medium">Wann</th>
								<th class="py-1 font-medium">Aufgabe</th>
								<th class="w-24 py-1 font-medium">Antwort</th>
								<th class="w-24 py-1 font-medium">richtig</th>
								<th class="w-48 py-1 font-medium">Fehlertyp</th>
							</tr>
						</thead>
						<tbody>
							{#each data.letzteFehler as f (f.id)}
								<tr class="border-b border-slate-100 last:border-0">
									<td class="truncate py-0.5 text-slate-600 tabular-nums"
										>{uhrzeit.format(f.zeit)}</td
									>
									<td class="truncate py-0.5" title="{f.skill}: {f.aufgabe}">{f.aufgabe}</td>
									<td
										class="truncate py-0.5 font-medium text-red-700"
										title={f.zweiterVersuch ? 'zweiter Versuch mit Material' : 'erster Versuch'}
										>{f.antwort}{#if f.zweiterVersuch}<sup class="text-slate-500">2</sup>{/if}</td
									>
									<td class="truncate py-0.5">{f.loesung}</td>
									<td class="truncate py-0.5 text-slate-600" title={f.fehler}>{f.fehler}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</section>
		</div>
	</div>
</main>
