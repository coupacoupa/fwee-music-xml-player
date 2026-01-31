import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core';

export const sheets = pgTable('sheets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  originalFilename: text('original_filename').notNull(),
  musicxmlStoragePath: text('musicxml_storage_path').notNull(),
  musicxmlFormat: text('musicxml_format').default('musicxml'), // 'musicxml' or 'mxl' (compressed)
  status: text('status').notNull().default('completed'), // 'completed' (uploaded and ready), 'failed'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type Sheet = typeof sheets.$inferSelect;
export type NewSheet = typeof sheets.$inferInsert;
