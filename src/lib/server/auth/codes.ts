import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { student } from '$lib/server/db/schema';
import { codeIndex, generateCode, hashSecret, verifySecret } from './crypto';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Aktive Schüler, deren Code zu `code` passt (höchstens einer, da Codes instanzweit eindeutig sind). */
async function studentsMatching(tx: Tx | typeof db, code: string) {
	const candidates = await tx
		.select({ id: student.id, codeHash: student.codeHash, label: student.label })
		.from(student)
		.where(and(eq(student.codeIndex, codeIndex(code)), eq(student.archived, false)));
	const matches = [];
	for (const c of candidates) {
		if (c.codeHash && (await verifySecret(c.codeHash, code))) matches.push(c);
	}
	return matches;
}

export async function findStudentByCode(code: string) {
	if (!/^\d{6}$/.test(code)) return null;
	const [match] = await studentsMatching(db, code);
	return match ?? null;
}

/**
 * Erzeugt für jeden Schüler einen neuen, instanzweit eindeutigen Code, speichert nur Hash und
 * Kurzindex und setzt `code_last_rotated`, womit bestehende Schüler-Sessions ungültig werden.
 * Gibt die Klartext-Codes zurück; sie sind danach nirgends mehr abrufbar.
 */
export async function assignNewCodes(studentIds: string[]): Promise<Map<string, string>> {
	const result = new Map<string, string>();
	await db.transaction(async (tx) => {
		// Serialisiert Codevergabe instanzweit, damit zwei parallele Vergaben nicht denselben Code ziehen.
		await tx.execute(sql`select pg_advisory_xact_lock(hashtext('student_code'))`);
		const taken = new Set<string>();
		for (const id of studentIds) {
			let code: string;
			do {
				code = generateCode();
			} while (taken.has(code) || (await studentsMatching(tx, code)).length > 0);
			taken.add(code);
			await tx
				.update(student)
				.set({
					codeHash: await hashSecret(code),
					codeIndex: codeIndex(code),
					codeLastRotated: new Date()
				})
				.where(eq(student.id, id));
			result.set(id, code);
		}
	});
	return result;
}
