<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	let { children } = $props();
</script>

{#if page.data.teacher}
	<header class="border-b border-slate-200 bg-white">
		<nav class="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
			<a href={resolve('/lehrer/gruppen')} class="font-semibold">Stellenwerttraining</a>
			<a href={resolve('/lehrer/gruppen')} class="text-slate-600 hover:text-slate-900">Gruppen</a>
			<span class="ml-auto text-sm text-slate-500">{page.data.teacher.email}</span>
			<form method="POST" action="/lehrer/abmelden">
				<button class="text-sm text-slate-600 underline hover:text-slate-900">Abmelden</button>
			</form>
		</nav>
	</header>
{/if}
{@render children()}
