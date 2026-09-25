const EINER = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
const ZEHN_BIS_19 = [
	'zehn',
	'elf',
	'zwölf',
	'dreizehn',
	'vierzehn',
	'fünfzehn',
	'sechzehn',
	'siebzehn',
	'achtzehn',
	'neunzehn'
];
const ZEHNER = [
	'',
	'',
	'zwanzig',
	'dreißig',
	'vierzig',
	'fünfzig',
	'sechzig',
	'siebzig',
	'achtzig',
	'neunzig'
];

/** 1 … 999; `ein` statt `eins` am Ende, wenn noch „tausend“ folgt */
function bis999(n: number, amEnde: boolean): string {
	const h = Math.floor(n / 100);
	const rest = n % 100;
	let wort = h > 0 ? `${EINER[h]}hundert` : '';
	if (rest === 1) wort += amEnde ? 'eins' : 'ein';
	else if (rest < 10) wort += EINER[rest];
	else if (rest < 20) wort += ZEHN_BIS_19[rest - 10];
	else {
		const e = rest % 10;
		wort += (e > 0 ? `${EINER[e]}und` : '') + ZEHNER[Math.floor(rest / 10)];
	}
	return wort;
}

/** Deutsches Zahlwort in Kleinschreibung, zusammengeschrieben, für 0 … 999 999 */
export function zahlwort(n: number): string {
	if (!Number.isInteger(n) || n < 0 || n > 999_999) throw new RangeError(`kein Zahlwort für ${n}`);
	if (n === 0) return 'null';
	const tausender = Math.floor(n / 1000);
	const rest = n % 1000;
	return (
		(tausender > 0 ? `${bis999(tausender, false)}tausend` : '') +
		(rest > 0 ? bis999(rest, true) : '')
	);
}
