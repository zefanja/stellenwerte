import { STELLEN } from './material';
import type { Antwort, Item, Material } from './typen';

/** Zahl mit schmalem Leerzeichen als Tausendertrenner und Komma: 4 090 und 2,13 */
export function zahlText(n: number): string {
	const [ganz, nach] = String(n).split('.');
	const gruppiert = ganz.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	return nach ? `${gruppiert},${nach}` : gruppiert;
}

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
		case 'rechnung':
			return `${zahlText(d.zahl)} ${d.op} ${zahlText(d.schritt)}`;
		case 'kette':
			return `${zahlText(d.start)} … ${zahlText(d.ziel)} in Schritten ${d.op}${zahlText(d.schritt)}`;
		case 'strahl':
			return d.modus === 'verorten'
				? `${zahlText(d.zahl)} auf dem Strahl ${zahlText(d.von)}–${zahlText(d.bis)}`
				: `Pfeil ablesen, Strahl ${zahlText(d.von)}–${zahlText(d.bis)}`;
		case 'vergleich':
			return `${zahlText(d.zahlen[0])} oder ${zahlText(d.zahlen[1])}`;
	}
}

export function antwortText(a: Antwort, item?: Item): string {
	switch (a.typ) {
		case 'zahl':
			return zahlText(a.wert);
		case 'material':
			return materialText(a.material);
		case 'kette':
			return a.werte.map(zahlText).join(', ');
		case 'vergleich': {
			const zahl =
				item?.darstellung.typ === 'vergleich'
					? zahlText(item.darstellung.zahlen[a.groessere])
					: ['links', 'rechts'][a.groessere];
			return `${zahl}, Stelle ${a.stelle}`;
		}
	}
}
