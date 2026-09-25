import type { Antwort } from '$lib/skills/typen';

/** Aufgabenauftrag vom Server: der Client generiert das Item daraus selbst. */
export interface Auftrag {
	skill_id: string;
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
}

export const SESSION_LAENGE = 10;
export const VERLAENGERUNG = 5;
export const MAX_VERLAENGERUNGEN = 3;
