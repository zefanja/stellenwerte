<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { postausgang } from '$lib/postausgang';

	let { children } = $props();

	// Sobald das Netz zurück ist, offline gesammelte Antworten senden
	onMount(() => {
		const senden = () => void postausgang.leeren();
		addEventListener('online', senden);
		return () => removeEventListener('online', senden);
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
