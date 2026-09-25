import type { Operation, Stelle } from '$lib/skills/typen';
import type { TafelModell } from './modell.svelte';

const NACH_SCHRITT: Record<number, Stelle> = { 1: 'E', 10: 'Z', 100: 'H', 1000: 'T' };

/** Stelle, an der ein Schritt von 1, 10, 100 oder 1000 wirkt */
export const schrittStelle = (schritt: number): Stelle => NACH_SCHRITT[schritt] ?? 'E';

/**
 * Stellenwechsel (Pflichtanimation): Beim Plus kommt ein Teil dazu, dann werden volle Stellen
 * nacheinander von rechts nach links gebündelt (399 + 1: Einer, dann Zehner). Beim Minus wird
 * von der nächsten besetzten Stelle nach rechts entbündelt, dann ein Teil weggenommen.
 */
export async function stellenwechsel(m: TafelModell, op: Operation, s: Stelle) {
	if (op === '+') {
		await m.hinzufuegen(s);
		await m.normieren();
		return;
	}
	const i = m.spalten.indexOf(s);
	if (m.anzahl(s) === 0) {
		let j = i - 1;
		while (j >= 0 && m.anzahl(m.spalten[j]) === 0) j--;
		for (let k = j; k >= 0 && k < i; k++) await m.entbuendeln(m.spalten[k]);
	}
	m.entferneLetztes(s);
}
