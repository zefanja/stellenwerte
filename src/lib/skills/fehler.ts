/** Fehlertypen mit Klartext für das Lehrer-Dashboard. */
export const FEHLERTYPEN = {
	ziffer_statt_buendel: 'liest die Ziffer an der Stelle ab, statt die Bündel zu zählen',
	kein_umbuendeln: 'tauscht den Überschuss nicht um',
	stellendreher: 'schreibt in Sprechreihenfolge (Zahlendreher)',
	stelle_isoliert: 'ändert nur eine Stelle und ignoriert den Übertrag',
	ziffernvergleich: 'vergleicht Ziffern statt Stellenwerte',
	zaehlfehler_eins: 'liegt genau um 1 daneben – zählt vermutlich einzeln',
	zaehlfehler_stelle: 'verzählt sich an einer Stelle um ein Bündel',
	nullstelle_fehlt: 'lässt Nullstellen weg',
	verkettet: 'schreibt Zahlteile nach Gehör hintereinander (300 und 5 → 3005)',
	stellenwert_ignoriert: 'behandelt alle Ziffern wie Einer',
	uebertrag_vergessen: 'verliert beim Umbündeln den Übertrag',
	falsche_stelle: 'zählt die Bündel einer falschen Stelle',
	gerundet: 'rundet, statt nur die vollen Bündel zu zählen',
	anzahl_abgeschrieben: 'schreibt die Bündelanzahl ohne ihren Stellenwert',
	kein_entbuendeln: 'tauscht nicht, obwohl an einer Stelle zu wenig da ist',
	entbuendeln_unvollstaendig: 'tauscht zu wenig oder an der falschen Stelle',
	wert_veraendert: 'verändert beim Tauschen den Wert der Zahl',
	sonstiges: 'unbekanntes Fehlermuster'
} as const;

export type ErrorTag = keyof typeof FEHLERTYPEN;
