import type { Stelle } from '$lib/skills/typen';

/** Eine Farbe je Stelle, für Material, Spaltenköpfe und Ziffern gleich */
export const FARBE: Record<Stelle, { fuellung: string; linie: string; text: string }> = {
	T: { fuellung: '#c4b5fd', linie: '#6d28d9', text: '#6d28d9' },
	H: { fuellung: '#6ee7b7', linie: '#047857', text: '#047857' },
	Z: { fuellung: '#7dd3fc', linie: '#0369a1', text: '#0369a1' },
	E: { fuellung: '#fcd34d', linie: '#b45309', text: '#b45309' }
};
