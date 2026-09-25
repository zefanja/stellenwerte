/** Deterministischer Zufall aus einem Seed (mulberry32). Seeds passen in einen int4 (0 … 2³¹−1). */
export class Rng {
	private state: number;

	constructor(seed: number) {
		this.state = seed >>> 0;
	}

	next(): number {
		let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	/** Ganzzahl in [min, max], beide eingeschlossen */
	int(min: number, max: number): number {
		return min + Math.floor(this.next() * (max - min + 1));
	}

	pick<T>(xs: readonly T[]): T {
		return xs[Math.floor(this.next() * xs.length)];
	}

	chance(p: number): boolean {
		return this.next() < p;
	}
}

export function neuerSeed(): number {
	return Math.floor(Math.random() * 0x7fffffff);
}
