<script lang="ts">
	import { FARBE } from '$lib/material/farben';
	import { EXPONENT, nachkommastellen, zifferAn } from '$lib/skills/stellen';
	import type { Stelle, StellenName } from '$lib/skills/typen';

	/**
	 * Zwei Zahlen nach Stellenwert untereinander in der Stellenwerttafel, das Komma als eigene
	 * Spalte. So wird sichtbar, dass 2,7 mehr Zehntel hat als 2,13.
	 */
	interface Props {
		zahlen: [number, number];
		stellen: StellenName[];
		markiert?: StellenName | null;
		groessere?: 0 | 1 | null;
	}
	let { zahlen, stellen, markiert = null, groessere = null }: Props = $props();
	const farbe = (s: StellenName) => (s in FARBE ? FARBE[s as Stelle].text : '#475569');
	/** Nur Stellen, die die Zahl wirklich hat: keine führenden Nullen, keine angehängten Nullen hinter dem Komma */
	const zeige = (n: number, s: StellenName) =>
		EXPONENT[s] >= 0
			? EXPONENT[s] < String(Math.trunc(n)).length
			: -EXPONENT[s] <= nachkommastellen(n);
	const kommaNach = $derived(stellen.indexOf('E'));
</script>

<table class="mx-auto text-center" data-testid="stellenvergleich">
	<thead>
		<tr>
			{#each stellen as s, i (s)}
				<th
					class="w-11 text-lg font-bold {markiert === s ? 'rounded-t bg-sky-100' : ''}"
					style:color={farbe(s)}>{s}</th
				>
				{#if i === kommaNach && kommaNach < stellen.length - 1}<th class="w-3"></th>{/if}
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each zahlen as n, z (z)}
			<tr class={groessere === z ? 'font-extrabold' : ''}>
				{#each stellen as s, i (s)}
					<td
						class="text-4xl tabular-nums {markiert === s ? 'bg-sky-100' : ''}"
						style:color={farbe(s)}
					>
						{zeige(n, s) ? zifferAn(n, EXPONENT[s]) : ''}
					</td>
					{#if i === kommaNach && kommaNach < stellen.length - 1}<td class="text-4xl"
							>{Number.isInteger(n) ? '' : ','}</td
						>{/if}
				{/each}
			</tr>
		{/each}
	</tbody>
</table>
