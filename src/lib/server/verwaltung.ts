import { error } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attempt, card, student, studentGroup, trainingSession } from '$lib/server/db/schema';
import { assignNewCodes } from '$lib/server/auth/codes';
import { codeAblage } from '$lib/server/codes/ablage';

/** Aktive Schüler einer Gruppe, die zur Lehrkraft gehören; unbekannte IDs werden ignoriert */
export async function schuelerDerGruppe(groupId: string, ids?: string[]) {
	const bedingung = and(eq(student.groupId, groupId), eq(student.archived, false));
	return db
		.select({ id: student.id, label: student.label })
		.from(student)
		.where(ids ? and(bedingung, inArray(student.id, ids)) : bedingung)
		.orderBy(asc(student.label));
}

export async function einSchuelerDerGruppe(groupId: string, studentId: unknown) {
	if (typeof studentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(studentId))
		error(400, 'Schüler fehlt');
	const [s] = await schuelerDerGruppe(groupId, [studentId]);
	if (!s) error(404, 'Schüler nicht gefunden');
	return s;
}

/**
 * Neue Codes erzeugen: alte werden sofort ungültig, angemeldete Geräte abgemeldet.
 * Die Klartexte gehen einmal an den Bildschirm und liegen 15 Minuten für das Druck-PDF bereit.
 */
export async function neueCodes(teacherId: string, schueler: { id: string; label: string }[]) {
	const codes = await assignNewCodes(schueler.map((s) => s.id));
	const karten = schueler.map((s) => ({ label: s.label, code: codes.get(s.id)! }));
	return { newCodes: karten, pdfToken: codeAblage.legeAb(teacherId, karten) };
}

export async function verschieben(teacherId: string, studentId: string, zielGruppe: unknown) {
	if (typeof zielGruppe !== 'string' || !/^[0-9a-f-]{36}$/i.test(zielGruppe))
		error(400, 'Zielgruppe fehlt');
	const [ziel] = await db
		.select({ id: studentGroup.id })
		.from(studentGroup)
		.where(and(eq(studentGroup.id, zielGruppe), eq(studentGroup.teacherId, teacherId)));
	if (!ziel) error(404, 'Zielgruppe nicht gefunden');
	await db.update(student).set({ groupId: ziel.id }).where(eq(student.id, studentId));
}

/**
 * Archivieren (Schuljahresende): Code und Label sind weg, das Kind kann sich nicht mehr anmelden.
 * `datenBehalten`: Karten und Versuche bleiben anonymisiert für die Statistik (Versuche werden nach
 * 12 Monaten ohnehin gelöscht); sonst wird der Schüler mit allen Daten gelöscht.
 */
export async function archivieren(studentIds: string[], datenBehalten: boolean) {
	if (studentIds.length === 0) return;
	if (!datenBehalten) return loeschen(studentIds);
	await db
		.update(student)
		.set({
			archived: true,
			label: 'archiviert',
			codeHash: null,
			codeIndex: null,
			codeLastRotated: new Date()
		})
		.where(inArray(student.id, studentIds));
}

/** Löscht Schüler samt Karten, Sessions und aller Versuche (Fremdschlüssel mit ON DELETE CASCADE). */
export async function loeschen(studentIds: string[]) {
	if (studentIds.length === 0) return;
	await db.delete(student).where(inArray(student.id, studentIds));
}

/** Auskunft nach Art. 15 DSGVO: alle gespeicherten Daten eines Schülers als JSON */
export async function datenAuskunft(studentId: string) {
	const [s] = await db
		.select({
			id: student.id,
			label: student.label,
			gruppe: studentGroup.name,
			archiviert: student.archived,
			codeZuletztGeaendert: student.codeLastRotated
		})
		.from(student)
		.innerJoin(studentGroup, eq(studentGroup.id, student.groupId))
		.where(eq(student.id, studentId));
	const [karten, sessions, versuche] = await Promise.all([
		db.select().from(card).where(eq(card.studentId, studentId)).orderBy(asc(card.skillId)),
		db
			.select()
			.from(trainingSession)
			.where(eq(trainingSession.studentId, studentId))
			.orderBy(asc(trainingSession.startedAt)),
		db
			.select()
			.from(attempt)
			.where(eq(attempt.studentId, studentId))
			.orderBy(asc(attempt.createdAt))
	]);
	return {
		hinweis:
			'Gespeichert werden nur Kürzel, Lernstand und Antworten. Der Anmeldecode liegt nur als Hash vor und ist hier nicht enthalten.',
		exportiert: new Date().toISOString(),
		schueler: s,
		karten,
		sessions,
		versuche
	};
}
