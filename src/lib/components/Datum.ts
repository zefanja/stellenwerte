/** Datumsangaben im Dashboard, immer in Schulzeit */
const tag = new Intl.DateTimeFormat('de-DE', {
	timeZone: 'Europe/Berlin',
	day: 'numeric',
	month: 'numeric'
});
const tagJahr = new Intl.DateTimeFormat('de-DE', {
	timeZone: 'Europe/Berlin',
	day: 'numeric',
	month: 'numeric',
	year: '2-digit'
});

export const datumKurz = (d: Date | null | undefined) => (d ? tag.format(d) : '–');
export const datumMitJahr = (d: Date | null | undefined) => (d ? tagJahr.format(d) : '–');
