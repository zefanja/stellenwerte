import type { Antwort } from '$lib/skills/typen';

/**
 * Rolle einer Aufgabe in der Session. Nur `wiederholung` und `pruefung` fließen in FSRS ein;
 * `beispiel` wird nur gezeigt, `gefuehrt` beginnt gleich mit Material.
 */
export type BlockArt =
	'aufwaermen' | 'wiederholung' | 'beispiel' | 'gefuehrt' | 'pruefung' | 'uebung' | 'abschluss';

/** Aufgabenauftrag vom Server: der Client generiert das Item daraus selbst. */
export interface Auftrag {
	skill_id: string;
	block: BlockArt;
	params: unknown;
	seed: number;
	/** HMAC über Session, Skill, Seed und Parameter; der Server nimmt nur eigene Aufträge an */
	token: string;
}

export interface SessionAntwort {
	session_id: string;
	auftraege: Auftrag[];
}

export interface VersuchMeldung {
	attempt_uuid: string;
	session_id: string;
	auftrag: Auftrag;
	answer: Antwort;
	duration_ms: number;
	/** zweiter Versuch, nachdem die Aufgabe mit Material wiederholt wurde */
	hint_used: boolean;
	/** Zeitpunkt der Antwort auf dem Gerät (ms), damit offline Geübtes den richtigen Tag bekommt */
	zeitpunkt?: number;
}

export const SESSION_LAENGE = 10;
export const VERLAENGERUNG = 5;
export const MAX_VERLAENGERUNGEN = 3;
