import { int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core"

// Mirrors seed_questions.json. year/session/timezone are nullable because the
// Edunade source does not expose exam metadata; latex/imageUrl/markscheme are
// nullable because a question carries its math inline in `statement` and may
// have no published markscheme.
export const questions = mysqlTable("questions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  course: varchar("course", { length: 16 }).notNull().default("AA HL"),
  year: int("year"),
  session: varchar("session", { length: 16 }),
  timezone: varchar("timezone", { length: 8 }),
  paper: varchar("paper", { length: 16 }),
  topic: varchar("topic", { length: 128 }).notNull(),
  subtopic: varchar("subtopic", { length: 128 }),
  difficulty: int("difficulty").notNull(),
  marks: int("marks").notNull(),
  statement: text("statement").notNull(),
  latex: text("latex"),
  imageUrl: text("image_url"),
  markscheme: text("markscheme"),
  // Provenance of the record ("edunade", "original", ...).
  source: varchar("source", { length: 64 }),
  // JSON arrays of hotlinked figure URLs for the statement / markscheme.
  images: text("images"),
  markschemeImages: text("markscheme_images"),
  // 1 when the statement references a figure that could not be recovered.
  diagramMissing: int("diagram_missing").default(0),
  tips: text("tips"),
})

export type QuestionRow = typeof questions.$inferSelect
export type NewQuestionRow = typeof questions.$inferInsert