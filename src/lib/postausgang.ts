import type { VersuchMeldung } from '$lib/training';

/**
 * Antworten werden der Reihe nach gesendet und bei Netzfehlern später erneut versucht,
 * damit die Session bei wackligem Mobilfunk weiterläuft. Doppelte Zustellung ist harmlos
 * (attempt_uuid). Die Ablage auf dem Gerät für echte Offline-Sessions folgt in Meilenstein 8.
 */
export class Postausgang {
	private warteschlange: VersuchMeldung[] = [];
	private laeuft: Promise<void> | null = null;

	senden(m: VersuchMeldung) {
		this.warteschlange.push(m);
		void this.leeren();
	}

	/** Versucht alles zu senden; wartet höchstens `maxMs`. */
	async leeren(maxMs = 10_000): Promise<boolean> {
		this.laeuft ??= this.abarbeiten().finally(() => (this.laeuft = null));
		await Promise.race([this.laeuft, new Promise((r) => setTimeout(r, maxMs))]);
		return this.warteschlange.length === 0;
	}

	private async abarbeiten() {
		let fehlversuche = 0;
		while (this.warteschlange.length > 0 && fehlversuche < 5) {
			const m = this.warteschlange[0];
			try {
				const res = await fetch('/api/attempt', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(m)
				});
				// 4xx ist endgültig (z. B. ungültiger Auftrag): nicht endlos wiederholen
				if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429))
					this.warteschlange.shift();
				else throw new Error(String(res.status));
				fehlversuche = 0;
			} catch {
				fehlversuche++;
				await new Promise((r) => setTimeout(r, 1000 * fehlversuche));
			}
		}
	}
}
