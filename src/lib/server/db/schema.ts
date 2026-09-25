import {
	pgTable,
	uuid,
	text,
	timestamp,
	boolean,
	integer,
	smallint,
	doublePrecision,
	jsonb,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const teacher = pgTable('teacher', {
	id: id(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: createdAt()
});

export const studentGroup = pgTable(
	'group',
	{
		id: id(),
		teacherId: uuid('teacher_id')
			.notNull()
			.references(() => teacher.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		/** Höchste freigegebene Förderwoche (1–6); Skills späterer Wochen bleiben gesperrt. */
		activeTrack: smallint('active_track').notNull().default(6),
		createdAt: createdAt()
	},
	(t) => [index('group_teacher_idx').on(t.teacherId)]
);

export const student = pgTable(
	'student',
	{
		id: id(),
		groupId: uuid('group_id')
			.notNull()
			.references(() => studentGroup.id, { onDelete: 'restrict' }),
		label: text('label').notNull(),
		/** Argon2id-Hash des sechsstelligen Codes; der Klartext wird nie gespeichert. */
		codeHash: text('code_hash'),
		/** Erste 3 Bytes eines HMAC(SECRET_KEY, code) als Hex, nur als Suchfeld für den Login. */
		codeIndex: text('code_index'),
		/** Schüler-Cookies, die vor diesem Zeitpunkt ausgestellt wurden, sind ungültig. */
		codeLastRotated: timestamp('code_last_rotated', { withTimezone: true }).notNull().defaultNow(),
		archived: boolean('archived').notNull().default(false)
	},
	(t) => [index('student_group_idx').on(t.groupId), index('student_code_index_idx').on(t.codeIndex)]
);

/** FSRS-Zustand, eine Zeile pro Schüler und Skill. Wird nur serverseitig geschrieben. */
export const card = pgTable(
	'card',
	{
		id: id(),
		studentId: uuid('student_id')
			.notNull()
			.references(() => student.id, { onDelete: 'cascade' }),
		skillId: text('skill_id').notNull(),
		stability: doublePrecision('stability').notNull().default(0),
		difficulty: doublePrecision('difficulty').notNull().default(0),
		due: timestamp('due', { withTimezone: true }).notNull().defaultNow(),
		lastReview: timestamp('last_review', { withTimezone: true }),
		reps: integer('reps').notNull().default(0),
		lapses: integer('lapses').notNull().default(0),
		/** ts-fsrs State: 0 New, 1 Learning, 2 Review, 3 Relearning */
		state: smallint('state').notNull().default(0),
		introducedAt: timestamp('introduced_at', { withTimezone: true })
	},
	(t) => [uniqueIndex('card_student_skill_uq').on(t.studentId, t.skillId)]
);

export const trainingSession = pgTable(
	'session',
	{
		id: id(),
		studentId: uuid('student_id')
			.notNull()
			.references(() => student.id, { onDelete: 'cascade' }),
		startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
		finishedAt: timestamp('finished_at', { withTimezone: true }),
		itemCount: integer('item_count').notNull().default(0),
		correctCount: integer('correct_count').notNull().default(0)
	},
	(t) => [index('session_student_idx').on(t.studentId, t.startedAt)]
);

/** Rohdaten jeder Antwort. Wird nie überschrieben, nach 12 Monaten gelöscht. */
export const attempt = pgTable(
	'attempt',
	{
		id: id(),
		attemptUuid: uuid('attempt_uuid').notNull().unique(),
		studentId: uuid('student_id')
			.notNull()
			.references(() => student.id, { onDelete: 'cascade' }),
		skillId: text('skill_id').notNull(),
		sessionId: uuid('session_id').references(() => trainingSession.id, { onDelete: 'cascade' }),
		seed: integer('seed').notNull(),
		/** Rolle in der Session (BlockArt); nur 'wiederholung' und 'pruefung' gehen in FSRS ein */
		block: text('block'),
		paramsJson: jsonb('params_json').notNull(),
		answerJson: jsonb('answer_json').notNull(),
		correct: boolean('correct').notNull(),
		errorTag: text('error_tag'),
		durationMs: integer('duration_ms').notNull(),
		hintUsed: boolean('hint_used').notNull().default(false),
		createdAt: createdAt()
	},
	(t) => [
		index('attempt_student_idx').on(t.studentId, t.createdAt),
		index('attempt_created_idx').on(t.createdAt)
	]
);
