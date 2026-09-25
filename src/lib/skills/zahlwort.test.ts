import { describe, expect, it } from 'vitest';
import { zahlwort, zahlwortGetrennt } from './zahlwort';

describe('zahlwort', () => {
	it.each([
		[0, 'null'],
		[1, 'eins'],
		[7, 'sieben'],
		[11, 'elf'],
		[12, 'zwölf'],
		[13, 'dreizehn'],
		[16, 'sechzehn'],
		[17, 'siebzehn'],
		[20, 'zwanzig'],
		[21, 'einundzwanzig'],
		[30, 'dreißig'],
		[43, 'dreiundvierzig'],
		[70, 'siebzig'],
		[99, 'neunundneunzig'],
		[100, 'einhundert'],
		[101, 'einhunderteins'],
		[305, 'dreihundertfünf'],
		[340, 'dreihundertvierzig'],
		[1000, 'eintausend'],
		[1001, 'eintausendeins'],
		[2043, 'zweitausenddreiundvierzig'],
		[21000, 'einundzwanzigtausend'],
		[101001, 'einhunderteintausendeins'],
		[999999, 'neunhundertneunundneunzigtausendneunhundertneunundneunzig']
	])('%i → %s', (n, wort) => {
		expect(zahlwort(n)).toBe(wort);
	});

	it('trennt an den Wortbausteinen', () => {
		expect(zahlwortGetrennt(168)).toBe('ein\u00ADhundert\u00ADacht\u00ADund\u00ADsechzig');
		expect(zahlwortGetrennt(2043)).toBe('zwei\u00ADtausend\u00ADdrei\u00ADund\u00ADvierzig');
	});

	it('lehnt Zahlen außerhalb 0 … 999 999 ab', () => {
		expect(() => zahlwort(1_000_000)).toThrow();
		expect(() => zahlwort(-1)).toThrow();
	});
});
