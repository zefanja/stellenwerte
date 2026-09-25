import { tick } from 'svelte';

/** Pflichtanimationen dauern insgesamt 400–600 ms: Bewegung plus kurzes Aufleuchten. */
export const BEWEGUNG_MS = 350;
export const LEUCHTEN_MS = 200;

export const warte = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Wartet, bis der aktuelle Zustand im DOM steht und gezeichnet ist, damit die nächste Änderung animiert wird. */
export async function gezeichnet() {
	await tick();
	await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}
