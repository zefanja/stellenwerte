<script lang="ts">
	import Vorlesen from './Vorlesen.svelte';

	let { text }: { text: string } = $props();
</script>

<div class="flex items-center gap-3">
	<Vorlesen {text} />
	<h1 class="text-xl leading-tight font-semibold" data-testid="prompt">{text}</h1>
</div>
