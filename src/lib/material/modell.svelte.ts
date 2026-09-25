/* eslint-disable svelte/prefer-svelte-reactivity -- Set/Map hier sind interne Hilfsstrukturen, nichts davon wird gerendert */
import { STELLEN, wert } from '$lib/skills/material';
import type { Material, Stelle } from '$lib/skills/typen';
import { SATZ } from '$lib/aufgaben/schritte.svelte';
import { BEWEGUNG_MS, LEUCHTEN_MS, gezeichnet, warte } from './animation';
import {
	layoutStreu,
	layoutTafel,
	teilGroesse,
	ZIFFERN_HOEHE,
	type Lage,
	type Rahmen,
	type StreuLayout,
	type TafelLayout
} from './layout';

/** Ein sichtbares Materialteil. Position und Größe in px relativ zum Feld. */
export interface Teil extends Rahmen {
	id: number;
	art: Stelle;
	lage: Lage;
	ausgewaehlt: boolean;
	leuchtet: boolean;
	/** true: Positionsänderung ohne Übergang (neu eingesetzt) */
	sofort: boolean;
	skala: number;
	deckkraft: number;
}

let naechsteId = 1;

function neuesTeil(art: Stelle, r: Rahmen, lage: Lage = 'stehend'): Teil {
	return {
		id: naechsteId++,
		art,
		lage,
		...r,
		ausgewaehlt: false,
		leuchtet: false,
		sofort: true,
		skala: 1,
		deckkraft: 1
	};
}

const hoeher = (s: Stelle): Stelle | undefined => STELLEN[STELLEN.indexOf(s) - 1];
const niedriger = (s: Stelle): Stelle | undefined => STELLEN[STELLEN.indexOf(s) + 1];

/**
 * Material in der Stellenwerttafel mit Bündeln, Entbündeln, Hinzufügen und „Material zu Zahl“.
 * Jede Operation animiert nur transform und opacity, damit sie auch auf alten Handys flüssig läuft.
 */
export class TafelModell {
	teile = $state<Teil[]>([]);
	layout = $state<TafelLayout | null>(null);
	/** Ziffern in der Ziffernzeile, sobald „Material zu Zahl“ gelaufen ist */
	ziffern = $state<Partial<Record<Stelle, number>> | null>(null);
	/** Spalte, deren Anzahl als Zahl angezeigt wird (z. B. „34“ über den Zehnern) */
	zaehler = $state<Stelle | null>(null);
	beschaeftigt = $state(false);
	private breite = 0;
	private hoehe = 0;
	private readonly start: Material;

	constructor(
		material: Material,
		readonly spalten: readonly Stelle[],
		readonly mitZiffernzeile: boolean,
		private readonly animiert: () => boolean
	) {
		this.start = { ...material };
		this.setze(material);
	}

	anzahl(s: Stelle): number {
		return this.teile.filter((t) => t.art === s).length;
	}

	material(): Material {
		const m: Material = {};
		for (const s of this.spalten) m[s] = this.anzahl(s);
		return m;
	}

	wert(): number {
		return wert(this.material());
	}

	kannBuendeln(s: Stelle): boolean {
		const h = hoeher(s);
		return !!h && this.spalten.includes(h) && this.anzahl(s) >= 10;
	}

	kannEntbuendeln(s: Stelle): boolean {
		const n = niedriger(s);
		return !!n && this.spalten.includes(n) && this.anzahl(s) >= 1;
	}

	setzeGroesse(breite: number, hoehe: number) {
		if (breite === this.breite && hoehe === this.hoehe) return;
		this.breite = breite;
		this.hoehe = hoehe;
		this.anordnen(true);
	}

	/** Zurück zum Ausgangsmaterial, ohne Animation */
	zuruecksetzen() {
		this.setze(this.start);
	}

	private setze(material: Material) {
		this.teile = this.spalten.flatMap((s) =>
			Array.from({ length: material[s] ?? 0 }, () => neuesTeil(s, { x: 0, y: 0, b: 0, h: 0 }))
		);
		this.ziffern = null;
		this.zaehler = null;
		this.anordnen(true);
	}

	private berechne(anzahlen: Partial<Record<Stelle, number>>): TafelLayout {
		return layoutTafel(anzahlen, this.spalten, this.breite, this.hoehe, this.mitZiffernzeile);
	}

	private anzahlen(): Partial<Record<Stelle, number>> {
		return this.material();
	}

	/** Alle Teile an ihre Layoutposition; Reihenfolge im Array = Reihenfolge in der Spalte */
	private anordnen(sofort: boolean, ausnehmen: Set<number> = new Set()) {
		if (!this.breite) return;
		const l = this.berechne(this.anzahlen());
		this.layout = l;
		// Nach „Material zu Zahl“ sind die Teile zu Ziffern geworden und bleiben es, auch wenn sich die Größe ändert
		if (this.ziffern) {
			this.inZiffernzellen(sofort);
			return;
		}
		const index: Partial<Record<Stelle, number>> = {};
		for (const t of this.teile) {
			const i = (index[t.art] = (index[t.art] ?? -1) + 1);
			if (ausnehmen.has(t.id)) continue;
			Object.assign(t, l.positionen[t.art]![i], { sofort, skala: 1, deckkraft: 1 });
		}
	}

	private inZiffernzellen(sofort: boolean) {
		const l = this.layout;
		if (!l) return;
		const mitte = this.hoehe - ZIFFERN_HOEHE / 2;
		for (const t of this.teile) {
			const r = l.spalten.find((sp) => sp.stelle === t.art)!;
			Object.assign(t, {
				x: r.x + r.breite / 2 - t.b / 2,
				y: mitte - t.h / 2,
				skala: 0.15,
				deckkraft: 0,
				sofort
			});
		}
	}

	private get mitAnimation() {
		return this.animiert() && this.breite > 0;
	}

	private async exklusiv(f: () => Promise<void>) {
		if (this.beschaeftigt) return;
		this.beschaeftigt = true;
		try {
			await f();
		} finally {
			this.beschaeftigt = false;
		}
	}

	/** Zehn Teile rücken zusammen und werden zu einem Teil der nächsthöheren Stelle, das kurz aufleuchtet. */
	buendeln(s: Stelle) {
		return this.exklusiv(async () => {
			if (!this.kannBuendeln(s)) return;
			const ziel = hoeher(s)!;
			const zehn = this.teile.filter((t) => t.art === s).slice(-10);
			const neu = neuesTeil(ziel, { x: 0, y: 0, b: 0, h: 0 });

			if (this.mitAnimation) {
				// Zielplatz aus dem künftigen Layout; die zehn Teile legen sich passgenau hinein
				const zukunft = this.anzahlen();
				zukunft[s]! -= 10;
				zukunft[ziel] = (zukunft[ziel] ?? 0) + 1;
				const l = this.berechne(zukunft);
				const platz = l.positionen[ziel]![zukunft[ziel]! - 1];
				const g = teilGroesse(s, l.u);
				zehn.forEach((t, i) => {
					const x = s === 'Z' ? platz.x + i * l.u : platz.x;
					const y = s === 'E' ? platz.y + (9 - i) * l.u : platz.y;
					Object.assign(t, { x, y, b: g.b, h: g.h, sofort: false, ausgewaehlt: false });
				});
				// übrige Teile rücken gleichzeitig an ihre neuen Plätze
				const weg = new Set(zehn.map((t) => t.id));
				const rest = this.teile.filter((t) => !weg.has(t.id));
				const index: Partial<Record<Stelle, number>> = {};
				for (const t of rest) {
					const i = (index[t.art] = (index[t.art] ?? -1) + 1);
					Object.assign(t, l.positionen[t.art]![i], { sofort: false });
				}
				await warte(BEWEGUNG_MS);
				Object.assign(neu, platz, { leuchtet: true });
				this.teile = [...rest, neu];
				this.layout = l;
				await warte(LEUCHTEN_MS);
				// $state kopiert eingefügte Objekte in einen Proxy: über das Array ändern, nicht über `neu`
				this.teile.at(-1)!.leuchtet = false;
			} else {
				const weg = new Set(zehn.map((t) => t.id));
				this.teile = [...this.teile.filter((t) => !weg.has(t.id)), neu];
				this.anordnen(true);
			}
		});
	}

	/** Ein Teil leuchtet auf und zerfällt sichtbar in zehn Teile der nächstniedrigeren Stelle. */
	entbuendeln(s: Stelle) {
		return this.exklusiv(async () => {
			if (!this.kannEntbuendeln(s)) return;
			const ziel = niedriger(s)!;
			const teil = this.teile.filter((t) => t.art === s).at(-1)!;
			const u = this.layout?.u ?? 10;
			const g = teilGroesse(ziel, u);
			const zehn = Array.from({ length: 10 }, (_, i) =>
				neuesTeil(ziel, {
					x: ziel === 'Z' ? teil.x + i * u : teil.x,
					y: ziel === 'E' ? teil.y + (9 - i) * u : teil.y,
					b: g.b,
					h: g.h
				})
			);
			if (this.mitAnimation) {
				teil.leuchtet = true;
				await warte(LEUCHTEN_MS);
				this.teile = [...this.teile.filter((t) => t.id !== teil.id), ...zehn];
				await gezeichnet();
				this.anordnen(false);
				await warte(BEWEGUNG_MS);
			} else {
				this.teile = [...this.teile.filter((t) => t.id !== teil.id), ...zehn];
				this.anordnen(true);
			}
		});
	}

	/** Neues Teil, optional ab einem Punkt im Feld (z. B. wo es abgelegt wurde) */
	hinzufuegen(s: Stelle, ab?: { x: number; y: number }) {
		return this.exklusiv(async () => {
			if (!this.spalten.includes(s)) return;
			const u = this.layout?.u ?? 10;
			const g = teilGroesse(s, u);
			const spalte = this.layout?.spalten.find((r) => r.stelle === s);
			const start = ab ?? { x: (spalte?.x ?? 0) + (spalte?.breite ?? 0) / 2, y: 0 };
			const neu = neuesTeil(s, { x: start.x - g.b / 2, y: start.y - g.h / 2, ...g });
			this.teile = [...this.teile, neu];
			if (this.mitAnimation) {
				await gezeichnet();
				this.anordnen(false);
			} else this.anordnen(true);
		});
	}

	entferneLetztes(s: Stelle) {
		const letztes = this.teile.filter((t) => t.art === s).at(-1);
		if (!letztes || this.beschaeftigt) return;
		this.teile = this.teile.filter((t) => t.id !== letztes.id);
		this.anordnen(!this.animiert());
	}

	/** „Material zu Zahl“: jede Spalte gleitet in ihre Zelle der Ziffernzeile und wird dort zur Ziffer. */
	zuZiffern() {
		return this.exklusiv(async () => {
			if (!this.mitZiffernzeile) return;
			this.inZiffernzellen(!this.mitAnimation);
			if (this.mitAnimation) await warte(BEWEGUNG_MS);
			this.ziffern = this.anzahlen();
		});
	}

	/**
	 * Alle Spalten mit zehn oder mehr Teilen bündeln, von klein nach groß. `vorher` läuft vor jedem
	 * Schritt (im Beispiel wartet es auf das Kind).
	 */
	async normieren(vorher: (satz: string) => Promise<void> = async () => {}) {
		for (const s of [...this.spalten].reverse()) {
			while (this.kannBuendeln(s)) {
				await vorher(SATZ.buendeln(s));
				await this.buendeln(s);
			}
		}
	}

	/** Alle Teile oberhalb von `ziel` bis dorthin entbündeln (für „Wie viele Zehner stecken in …?“) */
	async entbuendelnBis(ziel: Stelle, vorher: (satz: string) => Promise<void> = async () => {}) {
		for (const s of this.spalten) {
			if (s === ziel) break;
			while (this.anzahl(s) > 0) {
				await vorher(SATZ.entbuendeln(s));
				await this.entbuendeln(s);
			}
		}
	}
}

/**
 * Ungeordnete Menge zum Bündeln bis 100: liegende Zehnerstangen oben, lose Würfel verstreut.
 * Würfel antippen wählt sie aus; zehn ausgewählte werden zu einer Stange gebündelt.
 */
export class StreuModell {
	teile = $state<Teil[]>([]);
	beschaeftigt = $state(false);
	private layout: StreuLayout | null = null;
	/** Platzindex je Würfel, damit ein Würfel liegen bleibt, wo er liegt */
	private platz = new Map<number, number>();
	private readonly start: { Z: number; E: number };

	constructor(
		material: Material,
		private readonly seed: number,
		private readonly animiert: () => boolean
	) {
		this.start = { Z: material.Z ?? 0, E: material.E ?? 0 };
		this.setze();
	}

	get ausgewaehlt(): number {
		return this.teile.filter((t) => t.ausgewaehlt).length;
	}

	get loseWuerfel(): number {
		return this.teile.filter((t) => t.art === 'E').length;
	}

	wert(): number {
		return this.teile.reduce((s, t) => s + (t.art === 'Z' ? 10 : 1), 0);
	}

	setzeGroesse(breite: number, hoehe: number) {
		this.layout = layoutStreu(breite, hoehe, this.seed);
		this.anordnen(true);
	}

	zuruecksetzen() {
		this.setze();
		this.anordnen(true);
	}

	private setze() {
		this.platz.clear();
		const stangen = Array.from({ length: this.start.Z }, () =>
			neuesTeil('Z', { x: 0, y: 0, b: 0, h: 0 }, 'liegend')
		);
		const wuerfel = Array.from({ length: this.start.E }, (_, i) => {
			const t = neuesTeil('E', { x: 0, y: 0, b: 0, h: 0 });
			this.platz.set(t.id, i);
			return t;
		});
		this.teile = [...stangen, ...wuerfel];
	}

	private anordnen(sofort: boolean) {
		const l = this.layout;
		if (!l) return;
		let stange = 0;
		for (const t of this.teile) {
			const r =
				t.art === 'Z' ? l.stangenPlaetze[stange++] : l.wuerfelPlaetze[this.platz.get(t.id)!];
			Object.assign(t, r, { sofort, skala: 1, deckkraft: 1 });
		}
	}

	umschalten(id: number) {
		const t = this.teile.find((t) => t.id === id);
		if (!t || t.art !== 'E' || this.beschaeftigt) return;
		if (!t.ausgewaehlt && this.ausgewaehlt >= 10) return;
		t.ausgewaehlt = !t.ausgewaehlt;
	}

	/** Knopf in der unteren Hälfte: wählt die fehlenden Würfel sichtbar nacheinander aus und bündelt. */
	async zehnBuendeln() {
		if (this.beschaeftigt || this.loseWuerfel < 10) return;
		this.beschaeftigt = true;
		try {
			for (const t of this.teile) {
				if (this.ausgewaehlt >= 10) break;
				if (t.art === 'E' && !t.ausgewaehlt) {
					t.ausgewaehlt = true;
					if (this.animiert()) await warte(40);
				}
			}
			await this.buendelnIntern();
		} finally {
			this.beschaeftigt = false;
		}
	}

	async buendeln() {
		if (this.beschaeftigt || this.ausgewaehlt !== 10) return;
		this.beschaeftigt = true;
		try {
			await this.buendelnIntern();
		} finally {
			this.beschaeftigt = false;
		}
	}

	private async buendelnIntern() {
		const l = this.layout;
		const zehn = this.teile.filter((t) => t.ausgewaehlt).slice(0, 10);
		if (!l || zehn.length !== 10) return;
		const stangen = this.teile.filter((t) => t.art === 'Z').length;
		const platz = l.stangenPlaetze[stangen];
		const neu = neuesTeil('Z', platz, 'liegend');
		const weg = new Set(zehn.map((t) => t.id));
		if (this.animiert()) {
			zehn.forEach((t, i) =>
				Object.assign(t, { x: platz.x + i * l.u, y: platz.y, sofort: false, ausgewaehlt: false })
			);
			await warte(BEWEGUNG_MS);
			neu.leuchtet = true;
		}
		for (const t of zehn) this.platz.delete(t.id);
		// Stangen vor die Würfel, damit die Stangenplätze der Reihe nach belegt bleiben
		const rest = this.teile.filter((t) => !weg.has(t.id));
		this.teile = [...rest.filter((t) => t.art === 'Z'), neu, ...rest.filter((t) => t.art === 'E')];
		if (this.animiert()) {
			await warte(LEUCHTEN_MS);
			const eingesetzt = this.teile.find((t) => t.id === neu.id);
			if (eingesetzt) eingesetzt.leuchtet = false;
		}
	}

	/** Langes Drücken auf eine Stange: sie zerfällt in zehn Würfel auf freie Plätze. */
	async entbuendeln(id: number) {
		const l = this.layout;
		const stange = this.teile.find((t) => t.id === id);
		if (!l || !stange || stange.art !== 'Z' || this.beschaeftigt) return;
		const belegt = new Set(this.platz.values());
		const frei = l.wuerfelPlaetze.map((_, i) => i).filter((i) => !belegt.has(i));
		if (frei.length < 10) return;
		this.beschaeftigt = true;
		try {
			const wuerfel = Array.from({ length: 10 }, (_, i) => {
				const t = neuesTeil('E', { x: stange.x + i * l.u, y: stange.y, b: l.u, h: l.u });
				this.platz.set(t.id, frei[i]);
				return t;
			});
			if (this.animiert()) {
				stange.leuchtet = true;
				await warte(LEUCHTEN_MS);
			}
			this.teile = [...this.teile.filter((t) => t.id !== id), ...wuerfel];
			if (this.animiert()) {
				await gezeichnet();
				this.anordnen(false);
				await warte(BEWEGUNG_MS);
			} else this.anordnen(true);
		} finally {
			this.beschaeftigt = false;
		}
	}

	/** Lösung zeigen: so lange bündeln, wie es geht */
	async allesBuendeln(vorher: (satz: string) => Promise<void> = async () => {}) {
		while (this.loseWuerfel >= 10) {
			await vorher('Zehn Würfel werden zu einer Zehnerstange.');
			await this.zehnBuendeln();
		}
	}
}
