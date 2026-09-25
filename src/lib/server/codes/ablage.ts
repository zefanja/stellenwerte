import { randomBytes } from 'node:crypto';
import type { Codekarte } from './codekarten';

/**
 * Klartext-Codes für den Druck, nur im Speicher des einen Node-Prozesses und nur 15 Minuten.
 * So bleibt der Klartext aus Datenbank und Festplatte heraus: sichtbar ist er genau beim Erzeugen
 * (Bildschirm) und im Druck-PDF. Nach Ablauf oder Neustart hilft nur ein neuer Codewechsel.
 */
const GUELTIG_MS = 15 * 60 * 1000;

interface Eintrag {
	teacherId: string;
	karten: Codekarte[];
	bis: number;
}

export class CodeAblage {
	private eintraege = new Map<string, Eintrag>();

	constructor(private now: () => number = Date.now) {}

	legeAb(teacherId: string, karten: Codekarte[]): string {
		this.aufraeumen();
		const token = randomBytes(24).toString('base64url');
		this.eintraege.set(token, { teacherId, karten, bis: this.now() + GUELTIG_MS });
		return token;
	}

	/** Nur die Lehrkraft, die die Codes erzeugt hat, bekommt sie, und nur solange gültig */
	hole(teacherId: string, token: string): Codekarte[] | null {
		this.aufraeumen();
		const e = this.eintraege.get(token);
		return e && e.teacherId === teacherId ? e.karten : null;
	}

	private aufraeumen() {
		const jetzt = this.now();
		for (const [t, e] of this.eintraege) if (e.bis < jetzt) this.eintraege.delete(t);
	}
}

export const codeAblage = new CodeAblage();
