import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, bigint } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const captureJobs = mysqlTable("captureJobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  url: text("url").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  presets: json("presets").$type<string[]>().notNull(),
  waitStrategy: varchar("waitStrategy", { length: 64 }).default("networkidle"),
  customSelector: text("customSelector"),
  extraWaitMs: int("extraWaitMs").default(0),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CaptureJob = typeof captureJobs.$inferSelect;
export type InsertCaptureJob = typeof captureJobs.$inferInsert;

export const screenshots = mysqlTable("screenshots", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").references(() => captureJobs.id).notNull(),
  userId: int("userId").references(() => users.id),
  presetKey: varchar("presetKey", { length: 64 }).notNull(),
  width: int("width").notNull(),
  height: int("height").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  fileSizeBytes: bigint("fileSizeBytes", { mode: "number" }),
  analysisResult: json("analysisResult").$type<Record<string, unknown>>(),
  altText: text("altText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Screenshot = typeof screenshots.$inferSelect;
export type InsertScreenshot = typeof screenshots.$inferInsert;
