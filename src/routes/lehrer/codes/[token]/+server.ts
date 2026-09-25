import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { requireTeacher } from '$lib/server/auth/guard';
import { codeAblage } from '$lib/server/codes/ablage';
import { codekartenPdf } from '$lib/server/codes/codekarten';

/** Druck-PDF der gerade erzeugten Codes; nur für die erzeugende Lehrkraft, 15 Minuten lang */
export async function GET({ locals, params, url }) {
	const t = requireTeacher(locals);
	const karten = codeAblage.hole(t.id, params.token);
	if (!karten) error(410, 'Das Druck-PDF ist abgelaufen. Bitte die Codes neu erzeugen.');
	const pdf = await codekartenPdf(karten, env.ORIGIN || url.origin);
	return new Response(pdf.slice().buffer, {
		headers: {
			'content-type': 'application/pdf',
			'content-disposition': 'inline; filename="codekarten.pdf"',
			// Klartext-Codes: nirgends zwischenspeichern
			'cache-control': 'no-store, private'
		}
	});
}
