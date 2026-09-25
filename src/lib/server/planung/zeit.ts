/**
 * Kalendertage in Schulzeit (Europe/Berlin). FSRS plant hier tagesgenau: Eine Karte ist ab
 * Mitternacht ihres Fälligkeitstags fällig, egal ob das Kind morgens oder abends übt.
 */
const ZONE = 'Europe/Berlin';
const tagFormat = new Intl.DateTimeFormat('en-CA', {
	timeZone: ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});
const teileFormat = new Intl.DateTimeFormat('en-US', {
	timeZone: ZONE,
	hourCycle: 'h23',
	year: 'numeric',
	month: 'numeric',
	day: 'numeric',
	hour: 'numeric',
	minute: 'numeric'
});

/** Tag als 'YYYY-MM-DD' in Berliner Zeit */
export function tagVon(d: Date): string {
	return tagFormat.format(d);
}

/** Abstand Berlin – UTC in Minuten zum Zeitpunkt d (60 im Winter, 120 im Sommer) */
function versatzMinuten(d: Date): number {
	const t = Object.fromEntries(teileFormat.formatToParts(d).map((p) => [p.type, p.value]));
	const alsUtc = Date.UTC(+t.year, +t.month - 1, +t.day, +t.hour, +t.minute);
	return Math.round((alsUtc - Math.floor(d.getTime() / 60000) * 60000) / 60000);
}

/** Mitternacht Berliner Zeit am Tag `tag` als Zeitpunkt */
export function tagesbeginn(tag: string): Date {
	const utcMitternacht = Date.parse(`${tag}T00:00:00Z`);
	let d = new Date(utcMitternacht - versatzMinuten(new Date(utcMitternacht)) * 60000);
	// an Tagen mit Zeitumstellung gilt der Versatz nach der Korrektur
	d = new Date(utcMitternacht - versatzMinuten(d) * 60000);
	return d;
}

export function plusTage(tag: string, n: number): string {
	const d = new Date(`${tag}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

/** Beginn des nächsten Tages: alles, was davor fällig ist, ist heute fällig */
export function heuteEnde(jetzt: Date): Date {
	return tagesbeginn(plusTage(tagVon(jetzt), 1));
}

/** Ganze Kalendertage zwischen zwei Zeitpunkten (Berliner Tage) */
export function tageZwischen(von: Date, bis: Date): number {
	return Math.round(
		(Date.parse(`${tagVon(bis)}T12:00:00Z`) - Date.parse(`${tagVon(von)}T12:00:00Z`)) / 86_400_000
	);
}
