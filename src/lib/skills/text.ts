import { STELLEN } from './material';
import type { Antwort, Item, Material } from './typen';

/** Zahl mit schmalem Leerzeichen als Tausendertrenner: 4 090 */
export const zahlText = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** „3 H 0 Z 5 E“, nur gesetzte Spalten */
export function materialText(m: Material): string {
	const teile = STELLEN.filter((s) => m[s] !== undefined).map((s) => `${m[s]} ${s}`);
	return teile.length > 0 ? teile.join(' ') : 'nichts gelegt';
}

/** Kurzbeschreibung einer Aufgabe für das Dashboard, eine Zeile */
export function aufgabeText(item: Item): string {
	const d = item.darstellung;
	switch (d.typ) {
		case 'material':
			return d.anordnung === 'ungeordnet'
				? `bündeln: ${materialText(d.material)} durcheinander`
				: `Material ${materialText(d.material)}`;
		case 'stellen':
			return `${materialText(d.material)} als Zahl`;
		case 'zahlwort':
			return d.wort;
		case 'wegnahme':
			return `${zahlText(d.zahl)} − ${zahlText(d.abzug)}: tauschen`;
		case 'zahl':
			return `${zahlText(d.zahl)} legen`;
		case 'buendel':
		case 'buendel_umkehr':
			return item.prompt;
	}
}

export function antwortText(a: Antwort): string {
	return a.typ === 'zahl' ? zahlText(a.wert) : materialText(a.material);
}
