import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { CodeAblage } from './ablage';
import { A4 } from './codekarten';
import { codekartenPdf, KARTEN_JE_SEITE, kartenRahmen } from './codekarten';

describe('Codekarten-PDF', () => {
	it('acht Karten je A4-Seite, bündig im Raster ohne Überlappung', () => {
		const rahmen = Array.from({ length: 16 }, (_, i) => kartenRahmen(i));
		expect(KARTEN_JE_SEITE).toBe(8);
		expect(rahmen.filter((r) => r.seite === 0)).toHaveLength(8);
		expect(rahmen[8].seite).toBe(1);
		for (const r of rahmen) {
			expect(r.x).toBeGreaterThanOrEqual(0);
			expect(r.y).toBeGreaterThanOrEqual(-0.01);
			expect(r.x + r.breite).toBeLessThanOrEqual(A4.breite + 0.01);
			expect(r.y + r.hoehe).toBeLessThanOrEqual(A4.hoehe + 0.01);
		}
		const seite0 = rahmen.slice(0, 8);
		const flaeche = seite0.reduce((s, r) => s + r.breite * r.hoehe, 0);
		expect(flaeche).toBeCloseTo(A4.breite * A4.hoehe, 0);
	});

	it('neun Karten ergeben zwei Seiten A4 hoch; Umlaute und Sonderzeichen brechen nichts', async () => {
		const karten = Array.from({ length: 9 }, (_, i) => ({
			label: i === 0 ? 'Jürgen Ölßner 😀' : `Schüler ${i}`,
			code: `${100000 + i}`
		}));
		const bytes = await codekartenPdf(karten, 'https://stellenwert.example.de');
		const pdf = await PDFDocument.load(bytes);
		expect(pdf.getPageCount()).toBe(2);
		const { width, height } = pdf.getPage(0).getSize();
		expect([Math.round(width), Math.round(height)]).toEqual([595, 842]);
	});
});

describe('CodeAblage', () => {
	it('gibt Codes nur der erzeugenden Lehrkraft und nur 15 Minuten lang heraus', () => {
		let t = 0;
		const ablage = new CodeAblage(() => t);
		const token = ablage.legeAb('lehrer-a', [{ label: 'A', code: '123456' }]);
		expect(ablage.hole('lehrer-a', token)).toEqual([{ label: 'A', code: '123456' }]);
		expect(ablage.hole('lehrer-b', token)).toBeNull();
		t = 15 * 60 * 1000 + 1;
		expect(ablage.hole('lehrer-a', token)).toBeNull();
	});
});
