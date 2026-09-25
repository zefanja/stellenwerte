<script lang="ts">
	import { zahlText } from '$lib/skills/text';

	/**
	 * Leerer Zahlenstrahl als SVG: nur die Enden beschriftet. Optional eine Marke (Regler), ein Pfeil
	 * (Ablesen), eine Einteilung in Zehntel (Hilfe) und die richtige Lage (Lösung).
	 * Mit `onsetze` ist der Strahl selbst die Eingabe: Tippen oder Ziehen setzt die Marke.
	 */
	interface Props {
		von: number;
		bis: number;
		marke?: number | null;
		pfeil?: number | null;
		loesung?: number | null;
		teilung?: boolean;
		onsetze?: (wert: number) => void;
	}
	let {
		von,
		bis,
		marke = null,
		pfeil = null,
		loesung = null,
		teilung = false,
		onsetze
	}: Props = $props();

	const L = 40;
	const R = 960;
	const x = (w: number) => L + ((w - von) / (bis - von)) * (R - L);
	let svg: SVGSVGElement;
	let ziehen = false;

	function wertBei(e: PointerEvent) {
		const r = svg.getBoundingClientRect();
		const px = ((e.clientX - r.left) / r.width) * 1000;
		return von + ((Math.min(R, Math.max(L, px)) - L) / (R - L)) * (bis - von);
	}
	function down(e: PointerEvent) {
		if (!onsetze) return;
		ziehen = true;
		svg.setPointerCapture(e.pointerId);
		onsetze(wertBei(e));
	}
	function move(e: PointerEvent) {
		if (ziehen && onsetze) onsetze(wertBei(e));
	}
	const up = () => (ziehen = false);
</script>

<svg
	bind:this={svg}
	viewBox="0 0 1000 140"
	class="w-full select-none {onsetze ? 'cursor-pointer' : ''}"
	style:touch-action={onsetze ? 'none' : 'auto'}
	role={onsetze ? 'slider' : 'img'}
	aria-label="Zahlenstrahl von {zahlText(von)} bis {zahlText(bis)}"
	aria-valuemin={von}
	aria-valuemax={bis}
	aria-valuenow={marke ?? undefined}
	onpointerdown={down}
	onpointermove={move}
	onpointerup={up}
	onpointercancel={up}
	data-testid="strahl"
>
	<!-- großzügige Tippfläche um die Linie -->
	<rect x="0" y="20" width="1000" height="110" fill="transparent" />
	<line x1={L} y1="70" x2={R} y2="70" stroke="#334155" stroke-width="4" stroke-linecap="round" />
	{#each teilung ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [] as i (i)}
		<line
			x1={L + (i * (R - L)) / 10}
			y1={i === 5 ? 52 : 60}
			x2={L + (i * (R - L)) / 10}
			y2={i === 5 ? 88 : 80}
			stroke="#64748b"
			stroke-width="3"
		/>
	{/each}
	{#if teilung}
		<text x={x((von + bis) / 2)} y="118" text-anchor="middle" font-size="28" fill="#64748b"
			>{zahlText((von + bis) / 2)}</text
		>
	{/if}
	{#each [von, bis] as ende, i (i)}
		<line x1={x(ende)} y1="45" x2={x(ende)} y2="95" stroke="#334155" stroke-width="4" />
		<text
			x={x(ende)}
			y="130"
			text-anchor={i === 0 ? 'start' : 'end'}
			font-size="32"
			font-weight="700"
			fill="#0f172a">{zahlText(ende)}</text
		>
	{/each}
	{#if pfeil !== null}
		<path d="M {x(pfeil)} 62 l -16 -30 h 32 z" fill="#0369a1" data-testid="pfeil" />
	{/if}
	{#if loesung !== null}
		<g class="loesung">
			<line x1={x(loesung)} y1="30" x2={x(loesung)} y2="100" stroke="#059669" stroke-width="6" />
			<text
				x={x(loesung)}
				y="24"
				text-anchor="middle"
				font-size="30"
				font-weight="700"
				fill="#047857">{zahlText(loesung)}</text
			>
		</g>
	{/if}
	{#if marke !== null}
		<circle
			cx={x(marke)}
			cy="70"
			r="22"
			fill="#f59e0b"
			stroke="#b45309"
			stroke-width="4"
			data-testid="marke"
		/>
	{/if}
</svg>

<style>
	.loesung {
		animation: auf 400ms ease-out;
	}
	@keyframes auf {
		from {
			opacity: 0;
		}
	}
</style>
