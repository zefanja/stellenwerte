<script lang="ts">
	import { enhance } from '$app/forms';
	let { form } = $props();
</script>

<svelte:head><title>Anmeldung Lehrkraft</title></svelte:head>

<main class="mx-auto mt-24 max-w-sm px-4">
	<h1 class="mb-6 text-2xl font-semibold">Stellenwerttraining – Lehrkraft</h1>
	<form method="POST" use:enhance class="flex flex-col gap-4">
		<label class="flex flex-col gap-1">
			<span>E-Mail</span>
			<input
				name="email"
				type="email"
				required
				autocomplete="username"
				value={form?.email ?? ''}
				class="input"
			/>
		</label>
		<label class="flex flex-col gap-1">
			<span>Passwort</span>
			<input
				name="password"
				type="password"
				required
				autocomplete="current-password"
				class="input"
			/>
		</label>
		{#if form?.message}<p class="text-red-700" role="alert">{form.message}</p>{/if}
		<button class="btn-primary">Anmelden</button>
	</form>
</main>
