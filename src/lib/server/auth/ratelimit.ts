/**
 * Einfaches Rate Limit im Speicher des (einzigen) Node-Prozesses.
 * Gezählt werden nur Fehlversuche, damit eine ganze Klasse hinter einer Schul-IP
 * sich gleichzeitig anmelden kann: 10 Fehlversuche pro Minute, danach 60 s Sperre.
 */
const WINDOW_MS = 60_000;
const MAX_FAILURES = 10;
const BLOCK_MS = 60_000;

interface Entry {
	windowStart: number;
	failures: number;
	blockedUntil: number;
}

export class RateLimiter {
	private entries = new Map<string, Entry>();

	constructor(private now: () => number = Date.now) {}

	/** Sekunden bis zur Entsperrung, 0 wenn nicht gesperrt. */
	blockedFor(key: string): number {
		const e = this.entries.get(key);
		if (!e) return 0;
		const rest = e.blockedUntil - this.now();
		return rest > 0 ? Math.ceil(rest / 1000) : 0;
	}

	recordFailure(key: string): void {
		const now = this.now();
		let e = this.entries.get(key);
		if (!e || now - e.windowStart > WINDOW_MS) {
			e = { windowStart: now, failures: 0, blockedUntil: e?.blockedUntil ?? 0 };
			this.entries.set(key, e);
		}
		e.failures++;
		if (e.failures >= MAX_FAILURES) {
			e.blockedUntil = now + BLOCK_MS;
			e.failures = 0;
			e.windowStart = now;
		}
		if (this.entries.size > 10_000) this.prune();
	}

	private prune() {
		const now = this.now();
		for (const [key, e] of this.entries) {
			if (e.blockedUntil < now && now - e.windowStart > WINDOW_MS) this.entries.delete(key);
		}
	}
}

export const teacherLoginLimiter = new RateLimiter();
export const studentLoginLimiter = new RateLimiter();
