import type { VersuchMeldung } from '$lib/training';

/**
 * Warteschlange für Antworten und Sessionabschlüsse. Liegt im localStorage, damit eine Session
 * ohne Netz zu Ende laufen kann und danach synchronisiert wird, auch nach einem Neustart der App.
 * Gesendet wird der Reihe nach; doppelte Zustellung ist harmlos (attempt_uuid, idempotenter Abschluss).
 */
type Eintrag = { art: 'versuch'; daten: VersuchMeldung } | { art: 'abschluss'; session_id: string };

const SCHLUESSEL = 'swt_postausgang';

class Postausgang {
	private liste: Eintrag[] | null = null;
	private laeuft: Promise<void> | null = null;

	private get eintraege(): Eintrag[] {
		if (!this.liste) {
			try {
				this.liste = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? '[]');
			} catch {
				this.liste = [];
			}
		}
		return this.liste!;
	}

	private speichern() {
		try {
			localStorage.setItem(SCHLUESSEL, JSON.stringify(this.eintraege));
		} catch {
			// ohne localStorage bleibt die Liste im Speicher dieser Seite
		}
	}

	get anzahl(): number {
		return this.eintraege.filter((e) => e.art === 'versuch').length;
	}

	senden(daten: VersuchMeldung) {
		this.eintraege.push({ art: 'versuch', daten });
		this.speichern();
		void this.leeren();
	}

	/** Session abschließen; true, wenn alles beim Server angekommen ist */
	abschliessen(sessionId: string, maxMs = 5000): Promise<boolean> {
		this.eintraege.push({ art: 'abschluss', session_id: sessionId });
		this.speichern();
		return this.leeren(maxMs);
	}

	/** Versucht alles zu senden; wartet höchstens `maxMs`. true, wenn nichts mehr offen ist. */
	async leeren(maxMs = 10_000): Promise<boolean> {
		this.laeuft ??= this.abarbeiten().finally(() => (this.laeuft = null));
		await Promise.race([this.laeuft, new Promise((r) => setTimeout(r, maxMs))]);
		return this.eintraege.length === 0;
	}

	private async abarbeiten() {
		while (this.eintraege.length > 0) {
			const e = this.eintraege[0];
			let res: Response;
			try {
				res =
					e.art === 'versuch'
						? await fetch('/api/attempt', {
								method: 'POST',
								headers: { 'content-type': 'application/json' },
								body: JSON.stringify(e.daten)
							})
						: await fetch('/api/session/finish', {
								method: 'POST',
								headers: { 'content-type': 'application/json' },
								body: JSON.stringify({ session_id: e.session_id })
							});
			} catch {
				return; // kein Netz: beim nächsten „online“ oder App-Start weiter
			}
			// 4xx ist endgültig (z. B. anderes Kind angemeldet): verwerfen statt ewig wiederholen
			if (!res.ok && (res.status >= 500 || res.status === 429)) return;
			this.eintraege.shift();
			this.speichern();
		}
	}
}

export const postausgang = new Postausgang();
