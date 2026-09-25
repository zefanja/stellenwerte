import { STELLENNAME } from '$lib/skills/material';
import type { Stelle } from '$lib/skills/typen';

/**
 * Takt vor jedem Schritt einer Lösungsanimation. Im Beispiel („Schau zu“) wartet er, bis das Kind
 * „Nächster Schritt“ tippt, und zeigt dazu einen kurzen Satz; sonst läuft die Animation durch.
 */
export type Takt = (beschreibung: string) => Promise<void>;

export const ohneHalt: Takt = async () => {};

export class Schrittfolge {
	text = $state('');
	wartet = $state(false);
	private loslassen: (() => void) | null = null;

	takt: Takt = (beschreibung) => {
		this.text = beschreibung;
		this.wartet = true;
		return new Promise<void>((r) => {
			this.loslassen = r;
		});
	};

	weiter() {
		this.wartet = false;
		this.loslassen?.();
		this.loslassen = null;
	}

	/** Abschlusssatz nach dem letzten Schritt */
	fertig(text: string) {
		this.text = text;
		this.wartet = false;
	}
}

const HOEHER: Partial<Record<Stelle, Stelle>> = { E: 'Z', Z: 'H', H: 'T' };
const NIEDRIGER: Partial<Record<Stelle, Stelle>> = { T: 'H', H: 'Z', Z: 'E' };

/** Sätze für die Schritte, kurz und in der Sprache der Stellenwerttafel */
export const SATZ = {
	buendeln: (s: Stelle) =>
		`10 ${STELLENNAME[s].mehrzahl} werden zu 1 ${STELLENNAME[HOEHER[s] ?? s].einzahl}.`,
	entbuendeln: (s: Stelle) =>
		`1 ${STELLENNAME[s].einzahl} wird zu 10 ${STELLENNAME[NIEDRIGER[s] ?? s].mehrzahl}.`,
	dazu: (s: Stelle) => `1 ${STELLENNAME[s].einzahl} kommt dazu.`,
	weg: (s: Stelle) => `1 ${STELLENNAME[s].einzahl} wird weggenommen.`,
	ziffern: 'Jetzt wird das Material zur Zahl.',
	start: 'Schau zu, wie es geht.'
};
