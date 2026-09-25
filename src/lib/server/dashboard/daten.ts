import { and, asc, count, countDistinct, desc, eq, gte, inArray, max, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attempt, card, student, studentGroup } from '$lib/server/db/schema';
import { FEHLERTYPEN, type ErrorTag } from '$lib/skills/fehler';
import { KATALOG, SKILLS } from '$lib/skills/katalog';
import { antwortText, aufgabeText } from '$lib/skills/text';
import type { Antwort } from '$lib/skills/typen';
import { median, zellStatus, type ZellStatus } from '$lib/dashboard/regeln';

const TAG_MS = 86_400_000;
/** Zeitraum für Fehlerbilder: die letzten vier Wochen, also das, was im Fördergespräch zählt */
export const FEHLER_TAGE = 28;
export const ZEITACHSE_TAGE = 42;

/** Skills in der Übersicht: alle mit Generator, in Förderplan-Reihenfolge */
export const dashboardSkills = () =>
	KATALOG.filter((s) => s.generator).map((s) => ({ id: s.id, titel: s.titel, woche: s.woche }));

const berlinTag = sql<string>`to_char(${attempt.createdAt} at time zone 'Europe/Berlin', 'YYYY-MM-DD')`;

export function fehlerText(tag: string | null): string {
	return tag && tag in FEHLERTYPEN ? FEHLERTYPEN[tag as ErrorTag] : (tag ?? 'unbekannt');
}

export interface Zelle {
	status: ZellStatus;
	stability: number | null;
	due: Date | null;
	againInFolge: number;
}

/** Gruppenübersicht: eine Zeile pro Schüler, eine Spalte pro Skill, plus drei Kennzahlen. */
export async function gruppenUebersicht(groupId: string, jetzt: Date) {
	const schueler = await db
		.select({ id: student.id, label: student.label })
		.from(student)
		.where(and(eq(student.groupId, groupId), eq(student.archived, false)))
		.orderBy(asc(student.label));
	const ids = schueler.map((s) => s.id);
	const skills = dashboardSkills();
	if (ids.length === 0) {
		return {
			skills,
			zeilen: [],
			kennzahlen: { aktiv7: 0, schueler: 0, medianSessions: 0, rot: 0 },
			fehlerbilder: []
		};
	}

	const seit7 = new Date(jetzt.getTime() - 7 * TAG_MS);
	const [karten, sessions7, zuletzt, fehlerbilder] = await Promise.all([
		db.select().from(card).where(inArray(card.studentId, ids)),
		db
			.select({ studentId: attempt.studentId, n: countDistinct(attempt.sessionId) })
			.from(attempt)
			.where(and(inArray(attempt.studentId, ids), gte(attempt.createdAt, seit7)))
			.groupBy(attempt.studentId),
		db
			.select({ studentId: attempt.studentId, zuletzt: max(attempt.createdAt) })
			.from(attempt)
			.where(inArray(attempt.studentId, ids))
			.groupBy(attempt.studentId),
		db
			.select({ tag: attempt.errorTag, n: count() })
			.from(attempt)
			.where(
				and(
					inArray(attempt.studentId, ids),
					eq(attempt.correct, false),
					gte(attempt.createdAt, new Date(jetzt.getTime() - FEHLER_TAGE * TAG_MS))
				)
			)
			.groupBy(attempt.errorTag)
			.orderBy(desc(count()))
			.limit(5)
	]);

	const sessionsJe = new Map(sessions7.map((r) => [r.studentId, r.n]));
	const zuletztJe = new Map(zuletzt.map((r) => [r.studentId, r.zuletzt]));
	const zeilen = schueler.map((s) => {
		const zellen: Record<string, Zelle> = {};
		for (const sk of skills) {
			const k = karten.find((k) => k.studentId === s.id && k.skillId === sk.id);
			zellen[sk.id] = {
				status: zellStatus(k),
				stability: k && k.state !== 0 ? k.stability : null,
				due: k?.due ?? null,
				againInFolge: k?.againInFolge ?? 0
			};
		}
		return {
			...s,
			zellen,
			rot: Object.values(zellen).filter((z) => z.status === 'rot').length,
			sessions7: sessionsJe.get(s.id) ?? 0,
			zuletzt: zuletztJe.get(s.id) ?? null
		};
	});

	return {
		skills,
		zeilen,
		kennzahlen: {
			aktiv7: zeilen.filter((z) => z.sessions7 > 0).length,
			schueler: zeilen.length,
			medianSessions: median(zeilen.map((z) => z.sessions7)),
			rot: zeilen.reduce((n, z) => n + z.rot, 0)
		},
		fehlerbilder: fehlerbilder.map((f) => ({ tag: f.tag, text: fehlerText(f.tag), n: f.n }))
	};
}

/** Schüler laden und prüfen, dass er zu einer Gruppe der Lehrkraft gehört */
export async function eigenerSchueler(teacherId: string, studentId: string) {
	if (!/^[0-9a-f-]{36}$/i.test(studentId)) error(404, 'Schüler nicht gefunden');
	const [row] = await db
		.select({
			id: student.id,
			label: student.label,
			archived: student.archived,
			groupId: studentGroup.id,
			gruppe: studentGroup.name
		})
		.from(student)
		.innerJoin(studentGroup, eq(studentGroup.id, student.groupId))
		.where(and(eq(student.id, studentId), eq(studentGroup.teacherId, teacherId)));
	if (!row) error(404, 'Schüler nicht gefunden');
	return row;
}

/** Schülerprofil fürs Fördergespräch: Zeitachse, Skills, häufigste Fehler, letzte Fehlversuche. */
export async function schuelerProfil(studentId: string, jetzt: Date) {
	const seitZeitachse = new Date(jetzt.getTime() - ZEITACHSE_TAGE * TAG_MS);
	const seitFehler = new Date(jetzt.getTime() - FEHLER_TAGE * TAG_MS);
	const [tage, karten, fehlerJeTag, fehlerGesamt, letzte] = await Promise.all([
		db
			.select({
				tag: berlinTag,
				sessions: countDistinct(attempt.sessionId),
				aufgaben: sql<number>`count(*) filter (where not ${attempt.hintUsed})`.mapWith(Number),
				richtig:
					sql<number>`count(*) filter (where not ${attempt.hintUsed} and ${attempt.correct})`.mapWith(
						Number
					)
			})
			.from(attempt)
			.where(and(eq(attempt.studentId, studentId), gte(attempt.createdAt, seitZeitachse)))
			.groupBy(berlinTag),
		db.select().from(card).where(eq(card.studentId, studentId)),
		db
			.select({ tag: attempt.errorTag, n: count() })
			.from(attempt)
			.where(
				and(
					eq(attempt.studentId, studentId),
					eq(attempt.correct, false),
					gte(attempt.createdAt, seitFehler)
				)
			)
			.groupBy(attempt.errorTag)
			.orderBy(desc(count()))
			.limit(3),
		db
			.select({ n: count() })
			.from(attempt)
			.where(
				and(
					eq(attempt.studentId, studentId),
					eq(attempt.correct, false),
					gte(attempt.createdAt, seitFehler)
				)
			),
		db
			.select()
			.from(attempt)
			.where(and(eq(attempt.studentId, studentId), eq(attempt.correct, false)))
			.orderBy(desc(attempt.createdAt))
			.limit(10)
	]);

	const skills = dashboardSkills().map((s) => {
		const k = karten.find((k) => k.skillId === s.id);
		return {
			...s,
			status: zellStatus(k),
			due: k && k.state !== 0 ? k.due : null,
			stability: k && k.state !== 0 ? k.stability : null,
			einfuehrung: k?.state === 0
		};
	});

	return {
		tage: tage.map((t) => ({ ...t, sessions: Number(t.sessions) })),
		skills,
		fehlerGesamt: fehlerGesamt[0]?.n ?? 0,
		haeufigsteFehler: fehlerJeTag.map((f) => ({ tag: f.tag, text: fehlerText(f.tag), n: f.n })),
		letzteFehler: letzte.map((a) => {
			const skill = SKILLS.get(a.skillId);
			const item = skill?.generator?.generate(a.paramsJson, a.seed);
			return {
				id: a.id,
				zeit: a.createdAt,
				skill: skill?.titel ?? a.skillId,
				aufgabe: item ? aufgabeText(item) : '–',
				antwort: antwortText(a.answerJson as Antwort, item),
				loesung: item ? antwortText(item.loesung) : '–',
				fehler: fehlerText(a.errorTag),
				zweiterVersuch: a.hintUsed
			};
		})
	};
}

/** Daten für die CSV-Exporte einer Gruppe */
export async function exportDaten(groupId: string) {
	const schueler = await db
		.select({ id: student.id, label: student.label })
		.from(student)
		.where(and(eq(student.groupId, groupId), eq(student.archived, false)))
		.orderBy(asc(student.label));
	const ids = schueler.map((s) => s.id);
	if (ids.length === 0) return { schueler, karten: [], quoten: [], fehler: [] };
	const [karten, quoten, fehler] = await Promise.all([
		db.select().from(card).where(inArray(card.studentId, ids)),
		db
			.select({
				studentId: attempt.studentId,
				skillId: attempt.skillId,
				versuche: count(),
				richtig: sql<number>`count(*) filter (where ${attempt.correct})`.mapWith(Number)
			})
			.from(attempt)
			.where(and(inArray(attempt.studentId, ids), eq(attempt.hintUsed, false)))
			.groupBy(attempt.studentId, attempt.skillId),
		db
			.select({
				studentId: attempt.studentId,
				skillId: attempt.skillId,
				tag: attempt.errorTag,
				n: count()
			})
			.from(attempt)
			.where(and(inArray(attempt.studentId, ids), eq(attempt.correct, false)))
			.groupBy(attempt.studentId, attempt.skillId, attempt.errorTag)
			.orderBy(desc(count()))
	]);
	return { schueler, karten, quoten, fehler };
}
