<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Aufgabe from '$lib/aufgaben/Aufgabe.svelte';
	import type { Modus } from '$lib/aufgaben/hilfe';
	import { einstellungen, ladeEinstellungen } from '$lib/einstellungen.svelte';
	import { Postausgang } from '$lib/postausgang';
	import { SKILLS } from '$lib/skills/katalog';
	import type { Antwort, Item } from '$lib/skills/typen';
	import { MAX_VERLAENGERUNGEN, type Auftrag, type SessionAntwort } from '$lib/training';

	type Phase = 'laden' | 'aufgabe' | 'richtig' | 'ende' | 'leer' | 'fehler';

	let sessionId = '';
	let auftraege = $state<Auftrag[]>([]);
	let index = $state(0);
	let versuch = $state<1 | 2>(1);
	let modus = $state<Modus>('versuch');
	let phase = $state<Phase>('laden');
	let verlaengerungen = $state(0);
	/** true richtig, false nicht gelöst, null nur angeschaut (Beispiel) */
	let ergebnisse = $state<(boolean | null)[]>([]);
	let startZeit = 0;
	const postausgang = new Postausgang();

	const item: Item | null = $derived.by(() => {
		const a = auftraege[index];
		const g = a && SKILLS.get(a.skill_id)?.generator;
		return g ? g.generate(a.params, a.seed) : null;
	});

	async function lade(url: string) {
		const res = await fetch(url);
		if (!res.ok) throw new Error(String(res.status));
		return (await res.json()) as SessionAntwort;
	}

	onMount(async () => {
		ladeEinstellungen();
		try {
			const s = await lade('/api/session/next');
			sessionId = s.session_id;
			auftraege = s.auftraege;
			if (auftraege.length === 0) phase = 'leer';
			else starteAufgabe();
		} catch {
			phase = 'fehler';
		}
	});

	/** Beispiele laufen als Lösungsanimation („Schau zu“), begleitete Aufgaben beginnen mit Material. */
	function starteAufgabe() {
		const block = auftraege[index].block;
		phase = 'aufgabe';
		versuch = 1;
		modus = block === 'beispiel' ? 'loesung' : block === 'gefuehrt' ? 'hilfe' : 'versuch';
		startZeit = performance.now();
	}

	function nachAufgabe() {
		if (auftraege[index].block === 'beispiel') ergebnisse[index] = null;
		weiter();
	}

	function beantworte(antwort: Antwort) {
		if (!item || modus === 'loesung') return;
		const auftrag = auftraege[index];
		const bewertung = SKILLS.get(auftrag.skill_id)!.generator!.bewerte(item, antwort);
		postausgang.senden({
			attempt_uuid: crypto.randomUUID(),
			session_id: sessionId,
			auftrag,
			answer: antwort,
			duration_ms: Math.round(performance.now() - startZeit),
			hint_used: versuch === 2
		});

		if (bewertung.correct) {
			ergebnisse[index] = true;
			phase = 'richtig';
			setTimeout(weiter, einstellungen.animationen ? 700 : 400);
		} else if (versuch === 1) {
			// keine Fehlermeldung: dieselbe Aufgabe noch einmal, jetzt mit Material zum Tauschen
			versuch = 2;
			modus = 'hilfe';
			startZeit = performance.now();
		} else {
			ergebnisse[index] = false;
			modus = 'loesung';
		}
	}

	function weiter() {
		if (index + 1 < auftraege.length) {
			index++;
			starteAufgabe();
		} else phase = 'ende';
	}

	async function verlaengern() {
		phase = 'laden';
		try {
			const s = await lade(`/api/session/next?session=${sessionId}`);
			verlaengerungen++;
			if (s.auftraege.length === 0) {
				phase = 'ende';
				return;
			}
			auftraege = [...auftraege, ...s.auftraege];
			index++;
			starteAufgabe();
		} catch {
			phase = 'ende';
		}
	}

	async function beenden() {
		phase = 'laden';
		await postausgang.leeren();
		if (sessionId) {
			await fetch('/api/session/finish', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ session_id: sessionId })
			}).catch(() => {});
		}
		await goto(resolve('/'));
	}
</script>

<svelte:head><title>Üben</title></svelte:head>

<main class="mx-auto flex h-dvh max-w-md flex-col px-4 pt-2 pb-4">
	<header class="mb-2 flex items-center gap-2">
		<button
			type="button"
			class="flex h-11 w-11 items-center justify-center text-2xl text-slate-500"
			aria-label="Aufhören"
			onclick={beenden}>✕</button
		>
		<ol class="flex flex-1 flex-wrap justify-center gap-1.5" aria-label="Fortschritt">
			{#each { length: auftraege.length }, i (i)}
				<li
					class="h-2.5 w-2.5 rounded-full {i < index || (i === index && phase === 'ende')
						? ergebnisse[i]
							? 'bg-emerald-500'
							: ergebnisse[i] === null
								? 'bg-sky-300'
								: 'bg-slate-400'
						: i === index
							? 'bg-slate-800'
							: 'bg-slate-300'}"
				></li>
			{/each}
		</ol>
		<span class="w-11"></span>
	</header>

	<div class="relative min-h-0 flex-1">
		{#if phase === 'laden'}
			<p class="mt-24 text-center text-2xl text-slate-500">…</p>
		{:else if phase === 'fehler'}
			<div class="mt-24 flex flex-col items-center gap-6 text-center">
				<p class="text-2xl">Kein Netz.</p>
				<button
					type="button"
					class="min-h-16 rounded-2xl bg-slate-800 px-8 text-xl text-white"
					onclick={() => location.reload()}>Noch mal</button
				>
			</div>
		{:else if phase === 'leer'}
			<div class="flex h-full flex-col">
				<p class="flex flex-1 items-center justify-center text-center text-2xl">
					Für heute ist alles geschafft.
				</p>
				<button
					type="button"
					class="min-h-20 rounded-2xl bg-emerald-600 text-2xl font-semibold text-white shadow"
					onclick={beenden}>Fertig</button
				>
			</div>
		{:else if phase === 'ende'}
			<div class="flex h-full flex-col">
				<section class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
					<svg
						viewBox="0 0 24 24"
						class="h-24 w-24 text-emerald-600"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="10" /><path
							d="m7 12 3.5 3.5L17 9"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					<p class="text-3xl font-bold">Geschafft!</p>
					<p class="text-xl text-slate-600">
						{ergebnisse.filter((e) => e !== null).length} Aufgaben
					</p>
				</section>
				<div class="flex flex-col gap-3">
					{#if verlaengerungen < MAX_VERLAENGERUNGEN}
						<button
							type="button"
							class="min-h-20 rounded-2xl bg-white text-2xl font-semibold shadow"
							onclick={verlaengern}>Noch 5 Aufgaben</button
						>
					{/if}
					<button
						type="button"
						class="min-h-20 rounded-2xl bg-emerald-600 text-2xl font-semibold text-white shadow"
						onclick={beenden}>Fertig</button
					>
				</div>
			</div>
		{:else if item}
			{#key `${index}:${versuch}`}
				{#if auftraege[index].block === 'beispiel'}
					<p
						class="absolute -top-1 right-0 z-10 rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-800"
						data-testid="schau-zu"
					>
						Schau zu
					</p>
				{/if}
				<Aufgabe {item} {modus} onantwort={beantworte} onweiter={nachAufgabe} />
			{/key}
			{#if phase === 'richtig'}
				<!-- kurzes visuelles Signal ohne Ton -->
				<div
					class="richtig pointer-events-none absolute inset-0 flex items-center justify-center"
					data-testid="richtig"
				>
					<svg
						viewBox="0 0 24 24"
						class="h-40 w-40 rounded-full bg-emerald-500/90 p-6 text-white"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						aria-hidden="true"
					>
						<path d="m5 12 5 5L20 7" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</div>
			{/if}
		{/if}
	</div>
</main>

<style>
	.richtig {
		animation: auf 250ms ease-out;
	}
	@keyframes auf {
		from {
			opacity: 0;
			transform: scale(0.6);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.richtig {
			animation: none;
		}
	}
</style>
