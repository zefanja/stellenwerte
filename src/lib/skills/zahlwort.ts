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

/** 1 … 999 als Wortbausteine; `ein` statt `eins` am Ende, wenn noch „tausend“ folgt */
function bis999(n: number, amEnde: boolean): string[] {
	const h = Math.floor(n / 100);
	const rest = n % 100;
	const teile = h > 0 ? [EINER[h], 'hundert'] : [];
	if (rest === 1) teile.push(amEnde ? 'eins' : 'ein');
	else if (rest > 0 && rest < 10) teile.push(EINER[rest]);
	else if (rest >= 10 && rest < 20) teile.push(ZEHN_BIS_19[rest - 10]);
	else if (rest >= 20) {
		const e = rest % 10;
		if (e > 0) teile.push(EINER[e], 'und');
		teile.push(ZEHNER[Math.floor(rest / 10)]);
	}
	return teile;
}

/** Wortbausteine: 2043 → zwei | tausend | drei | und | vierzig */
export function zahlwortTeile(n: number): string[] {
	if (!Number.isInteger(n) || n < 0 || n > 999_999) throw new RangeError(`kein Zahlwort für ${n}`);
	if (n === 0) return ['null'];
	const tausender = Math.floor(n / 1000);
	const rest = n % 1000;
	return [
		...(tausender > 0 ? [...bis999(tausender, false), 'tausend'] : []),
		...(rest > 0 ? bis999(rest, true) : [])
	];
}

/** Deutsches Zahlwort in Kleinschreibung, zusammengeschrieben, für 0 … 999 999 */
export function zahlwort(n: number): string {
	return zahlwortTeile(n).join('');
}

/** Zahlwort mit weichen Trennstellen zwischen den Bausteinen, für den Zeilenumbruch am Handy */
export function zahlwortGetrennt(n: number): string {
	return zahlwortTeile(n).join('\u00AD');
}
