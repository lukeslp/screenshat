import { mysqlTable, int, varchar, timestamp } from 'drizzle-orm/mysql-core';

export const screenshots = mysqlTable('screenshots', {
  id: int('id').primaryKey().autoincrement(),
  filePath: varchar('file_path', { length: 255 }).notNull(),
  url: varchar('url', { length: 255 }).notNull(),
  altText: varchar('alt_text', { length: 500 }).default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
