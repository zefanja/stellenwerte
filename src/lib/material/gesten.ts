/**
 * Touch-Gesten als Svelte-Actions. Jede Geste hat eine Tipp-Alternative in der unteren
 * Bildschirmhälfte; Ziehen und langes Drücken sind nur Abkürzungen.
 */
const BEWEGUNG_TOLERANZ = 10;

/** Nach einer Geste den folgenden Klick verschlucken, damit nicht zusätzlich „getippt“ wird */
function klickVerschlucken(node: HTMLElement) {
	const weg = (e: Event) => {
		e.stopPropagation();
		e.preventDefault();
	};
	node.addEventListener('click', weg, { capture: true, once: true });
	setTimeout(() => node.removeEventListener('click', weg, { capture: true }), 400);
}

export function langDruck(node: HTMLElement, callback: () => void) {
	let cb = callback;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let start = { x: 0, y: 0 };
	const abbrechen = () => clearTimeout(timer);
	const down = (e: PointerEvent) => {
		start = { x: e.clientX, y: e.clientY };
		timer = setTimeout(() => {
			klickVerschlucken(node);
			cb();
		}, 500);
	};
	const move = (e: PointerEvent) => {
		if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > BEWEGUNG_TOLERANZ) abbrechen();
	};
	node.addEventListener('pointerdown', down);
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerup', abbrechen);
	node.addEventListener('pointercancel', abbrechen);
	node.addEventListener('contextmenu', (e) => e.preventDefault());
	return {
		update(neu: () => void) {
			cb = neu;
		},
		destroy() {
			abbrechen();
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', abbrechen);
			node.removeEventListener('pointercancel', abbrechen);
		}
	};
}

export interface ZiehOptionen {
	/** Wird mit dem Wert von data-ablage des Ziels aufgerufen */
	onablegen: (ziel: string, punkt: { x: number; y: number }) => void;
}

/** Ziehen mit Geisterbild. Ablageziele tragen `data-ablage="…"`. */
export function ziehbar(node: HTMLElement, optionen: ZiehOptionen) {
	let opt = optionen;
	let start: { x: number; y: number } | null = null;
	let geist: HTMLElement | null = null;
	let versatz = { x: 0, y: 0 };

	const down = (e: PointerEvent) => {
		if (e.button !== 0) return;
		start = { x: e.clientX, y: e.clientY };
	};
	const move = (e: PointerEvent) => {
		if (!start) return;
		if (!geist) {
			if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < BEWEGUNG_TOLERANZ) return;
			const r = node.getBoundingClientRect();
			versatz = { x: start.x - r.left, y: start.y - r.top };
			geist = node.cloneNode(true) as HTMLElement;
			Object.assign(geist.style, {
				position: 'fixed',
				left: '0',
				top: '0',
				width: `${r.width}px`,
				height: `${r.height}px`,
				margin: '0',
				pointerEvents: 'none',
				opacity: '0.85',
				zIndex: '50'
			});
			document.body.appendChild(geist);
			node.setPointerCapture(e.pointerId);
		}
		geist.style.transform = `translate(${e.clientX - versatz.x}px, ${e.clientY - versatz.y}px)`;
	};
	const up = (e: PointerEvent) => {
		if (geist) {
			geist.remove();
			geist = null;
			klickVerschlucken(node);
			const ziel = document
				.elementFromPoint(e.clientX, e.clientY)
				?.closest<HTMLElement>('[data-ablage]');
			if (ziel?.dataset.ablage) opt.onablegen(ziel.dataset.ablage, { x: e.clientX, y: e.clientY });
		}
		start = null;
	};
	const cancel = () => {
		geist?.remove();
		geist = null;
		start = null;
	};
	node.addEventListener('pointerdown', down);
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerup', up);
	node.addEventListener('pointercancel', cancel);
	return {
		update(neu: ZiehOptionen) {
			opt = neu;
		},
		destroy() {
			cancel();
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', cancel);
		}
	};
}
