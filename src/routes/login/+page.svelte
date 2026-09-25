<script lang="ts">
	import { afterNavigate, goto, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Ziffernblock from '$lib/components/Ziffernblock.svelte';
	import CodeAnzeige from '$lib/components/CodeAnzeige.svelte';

	type Zustand = 'eingabe' | 'pruefen' | 'rueckfrage' | 'gesperrt';

	let code = $state('');
	let zustand = $state<Zustand>('eingabe');
	let label = $state('');
	let meldung = $state('');
	let wackeln = $state(false);

	async function sende(bestaetigt: boolean) {
		const res = await fetch('/api/login', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ code, bestaetigt })
		});
		return { status: res.status, body: await res.json().catch(() => ({})) };
	}

	function falsch(text: string) {
		meldung = text;
		code = '';
		wackeln = true;
		setTimeout(() => (wackeln = false), 450);
	}

	function sperre(sekunden: number) {
		zustand = 'gesperrt';
		code = '';
		meldung = 'Kurz warten. Dann noch mal.';
		setTimeout(() => {
			zustand = 'eingabe';
			meldung = '';
		}, sekunden * 1000);
	}

	async function pruefe() {
		zustand = 'pruefen';
		meldung = '';
		try {
			const { status, body } = await sende(false);
			if (status === 200) {
				label = body.label;
				zustand = 'rueckfrage';
			} else if (status === 429) sperre(body.warten ?? 60);
			else {
				zustand = 'eingabe';
				falsch('Code falsch. Probier es noch mal.');
			}
		} catch {
			zustand = 'eingabe';
			meldung = 'Kein Netz. Probier es noch mal.';
		}
	}

	async function bestaetige() {
		zustand = 'pruefen';
		try {
			const { status, body } = await sende(true);
			if (status === 200) await goto(resolve('/'), { replaceState: true, invalidateAll: true });
			else if (status === 429) sperre(body.warten ?? 60);
			else {
				zustand = 'eingabe';
				falsch('Code falsch. Probier es noch mal.');
			}
		} catch {
			zustand = 'rueckfrage';
			meldung = 'Kein Netz. Probier es noch mal.';
		}
	}

	function nichtIch() {
		code = '';
		label = '';
		meldung = '';
		zustand = 'eingabe';
	}

	// QR-Code der Codekarte: /login?c=123456 trägt den Code ein und prüft sofort. Der Code
	// verschwindet aus der Adresszeile. afterNavigate statt onMount, weil replaceState den
	// initialisierten Router braucht.
	afterNavigate(() => {
		const c = page.url.searchParams.get('c') ?? '';
		if (!/^\d{6}$/.test(c)) return;
		replaceState(resolve('/login'), {});
		code = c;
		pruefe();
	});
</script>

<svelte:head><title>Anmelden</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6">
	{#if zustand === 'rueckfrage'}
		<section class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
			<p class="text-2xl">Bist du das?</p>
			<p class="text-5xl font-bold break-words" data-testid="label">{label}</p>
			{#if meldung}<p class="text-lg text-red-700" role="alert">{meldung}</p>{/if}
		</section>
		<div class="grid grid-cols-2 gap-3">
			<button type="button" class="wahl bg-emerald-600 text-white" onclick={bestaetige}>Ja</button>
			<button type="button" class="wahl bg-white" onclick={nichtIch}>Nein</button>
		</div>
	{:else}
		<section class="flex flex-1 flex-col items-center justify-center gap-6">
			<p class="text-2xl">Dein Code</p>
			<CodeAnzeige {code} {wackeln} />
			<p class="min-h-7 text-lg text-red-700" role="alert">{meldung}</p>
		</section>
		<Ziffernblock
			bind:wert={code}
			maxLaenge={6}
			bereit={code.length === 6}
			gesperrt={zustand !== 'eingabe'}
			onbestaetigen={pruefe}
		/>
	{/if}
</main>

<style>
	.wahl {
		min-height: 6rem;
		border-radius: 1rem;
		font-size: 1.75rem;
		font-weight: 600;
		box-shadow: 0 2px 0 rgb(0 0 0 / 0.15);
		touch-action: manipulation;
	}
</style>
