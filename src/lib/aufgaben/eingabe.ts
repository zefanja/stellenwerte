/** Getippte Zahl („3,4“) als Zahl; leere Eingabe ergibt NaN */
export const zahlAusEingabe = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')));
