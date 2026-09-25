import { describe, expect, it } from 'vitest';
import { RateLimiter } from './ratelimit';

describe('RateLimiter', () => {
	it('sperrt nach 10 Fehlversuchen für 60 Sekunden', () => {
		let t = 0;
		const rl = new RateLimiter(() => t);
		for (let i = 0; i < 9; i++) rl.recordFailure('ip');
		expect(rl.blockedFor('ip')).toBe(0);
		rl.recordFailure('ip');
		expect(rl.blockedFor('ip')).toBe(60);
		t = 59_000;
		expect(rl.blockedFor('ip')).toBe(1);
		t = 60_001;
		expect(rl.blockedFor('ip')).toBe(0);
	});

	it('setzt das Zählfenster nach einer Minute zurück', () => {
		let t = 0;
		const rl = new RateLimiter(() => t);
		for (let i = 0; i < 9; i++) rl.recordFailure('ip');
		t = 61_000;
		rl.recordFailure('ip');
		expect(rl.blockedFor('ip')).toBe(0);
	});
});
