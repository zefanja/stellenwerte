<script lang="ts">
	import type { ZellStatus } from '$lib/dashboard/regeln';

	/**
	 * Farbfeld der Gruppenübersicht. Zusätzlich zur Farbe ein Zeichen, damit der Zustand
	 * auch ohne Rot-Grün-Unterscheidung lesbar ist.
	 */
	let {
		status,
		titel,
		klein = false
	}: { status: ZellStatus; titel: string; klein?: boolean } = $props();
	const zeichen: Record<ZellStatus, string> = { grau: '', gelb: '·', gruen: '✓', rot: '!' };
	const farbe: Record<ZellStatus, string> = {
		grau: 'bg-slate-200 text-slate-500',
		gelb: 'bg-amber-300 text-amber-900',
		gruen: 'bg-emerald-500 text-white',
		rot: 'bg-red-600 text-white'
	};
</script>

<span
	class="inline-flex items-center justify-center rounded font-bold {klein
		? 'h-5 w-7 text-xs'
		: 'h-7 w-10 text-sm'} {farbe[status]}"
	title={titel}
	data-status={status}
>
	{zeichen[status]}
</span>
