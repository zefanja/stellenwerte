/** Regeln des Lehrer-Dashboards, ohne Datenbank und daher direkt testbar. */

export type ZellStatus = 'grau' | 'gelb' | 'gruen' | 'rot';

/** Ab dieser Stabilität (Tage) gilt ein Skill als stabil (grün) */
export const STABIL_TAGE = 21;
/** Ab so vielen Again-Bewertungen in Folge wird die Zelle rot */
export const ROT_AB_AGAIN = 2;

export interface KartenInfo {
	state: number;
	stability: number;
	againInFolge: number;
}

/**
 * Farbe einer Zelle der Gruppenübersicht. Rot hat Vorrang, weil die Leitfrage lautet:
 * Wer braucht diese Woche meine Aufmerksamkeit?
 */
export function zellStatus(k: KartenInfo | undefined): ZellStatus {
	if (!k) return 'grau';
	if (k.againInFolge >= ROT_AB_AGAIN) return 'rot';
	if (k.state === 2 && k.stability > STABIL_TAGE) return 'gruen';
	return 'gelb';
}

export const STATUS_TEXT: Record<ZellStatus, string> = {
	grau: 'nicht begonnen',
	gelb: 'im Aufbau',
	gruen: 'stabil',
	rot: 'braucht Hilfe'
};

export function median(xs: readonly number[]): number {
	if (xs.length === 0) return 0;
	const s = [...xs].sort((a, b) => a - b);
	const m = Math.floor(s.length / 2);
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * CSV für deutsches Excel: Semikolon, CRLF, UTF-8 mit BOM. Felder mit Trennzeichen,
 * Anführungszeichen oder Zeilenumbruch werden gequotet. Führende =, +, -, @ werden entschärft,
 * damit Kürzel nicht als Formel ausgeführt werden.
 */
export function csv(
	kopf: readonly string[],
	zeilen: readonly (readonly (string | number | null)[])[]
): string {
	const feld = (v: string | number | null) => {
		if (v === null) return '';
		let s = typeof v === 'number' ? String(v).replace('.', ',') : v;
		if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
		return /[;"\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
	};
	return '﻿' + [kopf, ...zeilen].map((z) => z.map(feld).join(';')).join('\r\n') + '\r\n';
}
