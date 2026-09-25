import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';

/** A4 hochformatig in Punkt, acht Karten je Seite: zwei Spalten, vier Zeilen */
export const A4 = { breite: 595.28, hoehe: 841.89 };
export const SPALTEN = 2;
export const ZEILEN = 4;
export const KARTEN_JE_SEITE = SPALTEN * ZEILEN;
const KARTE = { breite: A4.breite / SPALTEN, hoehe: A4.hoehe / ZEILEN };
const RAND = 18;
const QR_GROESSE = 118;

export interface Codekarte {
	label: string;
	code: string;
}

/** Position der i-ten Karte: Seite und linke untere Ecke in PDF-Koordinaten */
export function kartenRahmen(i: number) {
	const aufSeite = i % KARTEN_JE_SEITE;
	const spalte = aufSeite % SPALTEN;
	const zeile = Math.floor(aufSeite / SPALTEN);
	return {
		seite: Math.floor(i / KARTEN_JE_SEITE),
		x: spalte * KARTE.breite,
		y: A4.hoehe - (zeile + 1) * KARTE.hoehe,
		breite: KARTE.breite,
		hoehe: KARTE.hoehe
	};
}

export const codeGruppiert = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;
export const loginUrl = (origin: string, code: string) =>
	`${origin.replace(/\/$/, '')}/login?c=${code}`;

/** Standardschriften kennen nur WinAnsi; alles andere (z. B. Emoji) wird durch „?“ ersetzt. */
function druckbar(font: PDFFont, text: string): string {
	return [...text]
		.map((z) => {
			try {
				font.encodeText(z);
				return z;
			} catch {
				return '?';
			}
		})
		.join('');
}

/** Größte Schriftgröße ≤ max, bei der der Text in die Breite passt */
function passend(font: PDFFont, text: string, max: number, breite: number): number {
	let groesse = max;
	while (groesse > 8 && font.widthOfTextAtSize(text, groesse) > breite) groesse -= 0.5;
	return groesse;
}

function zeichneQr(seite: PDFPage, inhalt: string, x: number, y: number, groesse: number) {
	const qr = QRCode.create(inhalt, { errorCorrectionLevel: 'M' });
	const n = qr.modules.size;
	const ruhezone = 4;
	const modul = groesse / (n + 2 * ruhezone);
	for (let r = 0; r < n; r++) {
		for (let c = 0; c < n; c++) {
			if (!qr.modules.get(r, c)) continue;
			seite.drawRectangle({
				x: x + (c + ruhezone) * modul,
				y: y + groesse - (r + ruhezone + 1) * modul,
				width: modul,
				height: modul,
				color: rgb(0, 0, 0)
			});
		}
	}
}

function schnittlinien(seite: PDFPage) {
	const linie = { thickness: 0.5, color: rgb(0.6, 0.6, 0.6), dashArray: [4, 4] };
	for (let s = 1; s < SPALTEN; s++) {
		seite.drawLine({
			start: { x: s * KARTE.breite, y: 0 },
			end: { x: s * KARTE.breite, y: A4.hoehe },
			...linie
		});
	}
	for (let z = 1; z < ZEILEN; z++) {
		seite.drawLine({
			start: { x: 0, y: z * KARTE.hoehe },
			end: { x: A4.breite, y: z * KARTE.hoehe },
			...linie
		});
	}
}

/**
 * Codekarten als PDF: je Karte Label, Code in großer Schrift mit Zifferngruppierung, die kurze
 * Adresse der Instanz und ein QR-Code auf /login?c=…, der den Code direkt einträgt.
 * Wird nur serverseitig erzeugt, damit der Klartext nicht im Client-Cache landet.
 */
export async function codekartenPdf(
	karten: readonly Codekarte[],
	origin: string
): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	pdf.setTitle('Codekarten Stellenwerttraining');
	pdf.setCreator('Stellenwerttraining');
	pdf.setProducer('Stellenwerttraining');
	const fett = await pdf.embedFont(StandardFonts.HelveticaBold);
	const normal = await pdf.embedFont(StandardFonts.Helvetica);
	const mono = await pdf.embedFont(StandardFonts.CourierBold);
	const adresse = origin.replace(/^https?:\/\//, '').replace(/\/$/, '');

	const seiten: PDFPage[] = [];
	karten.forEach((karte, i) => {
		const r = kartenRahmen(i);
		if (!seiten[r.seite]) {
			seiten[r.seite] = pdf.addPage([A4.breite, A4.hoehe]);
			schnittlinien(seiten[r.seite]);
		}
		const seite = seiten[r.seite];
		const textBreite = r.breite - 3 * RAND - QR_GROESSE;
		const oben = r.y + r.hoehe - RAND;

		const label = druckbar(fett, karte.label);
		const labelGroesse = passend(fett, label, 20, textBreite);
		seite.drawText(label, {
			x: r.x + RAND,
			y: oben - labelGroesse,
			size: labelGroesse,
			font: fett
		});

		seite.drawText('Dein Code', {
			x: r.x + RAND,
			y: oben - 58,
			size: 10,
			font: normal,
			color: rgb(0.35, 0.35, 0.35)
		});
		const code = codeGruppiert(karte.code);
		seite.drawText(code, {
			x: r.x + RAND,
			y: oben - 92,
			size: passend(mono, code, 30, textBreite),
			font: mono
		});

		seite.drawText('Code eintippen oder', {
			x: r.x + RAND,
			y: r.y + RAND + 30,
			size: 9,
			font: normal,
			color: rgb(0.35, 0.35, 0.35)
		});
		seite.drawText('QR-Code scannen:', {
			x: r.x + RAND,
			y: r.y + RAND + 19,
			size: 9,
			font: normal,
			color: rgb(0.35, 0.35, 0.35)
		});
		seite.drawText(adresse, {
			x: r.x + RAND,
			y: r.y + RAND,
			size: passend(normal, adresse, 11, textBreite),
			font: normal
		});

		zeichneQr(
			seite,
			loginUrl(origin, karte.code),
			r.x + r.breite - RAND - QR_GROESSE,
			r.y + (r.hoehe - QR_GROESSE) / 2,
			QR_GROESSE
		);
	});
	if (seiten.length === 0) pdf.addPage([A4.breite, A4.hoehe]);
	return pdf.save();
}
