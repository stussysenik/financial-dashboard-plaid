import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  plaidAccessToken: text("plaid_access_token"),
});

export const plaidConnections = pgTable("plaid_connections", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  accessToken: text("access_token").notNull(),
  institutionId: text("institution_id").notNull(),
  institutionName: text("institution_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Simplified schema for single user system
export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
  })
  .extend({
    password: z.string().min(4),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Plaid types
export const plaidTransactionSchema = z.object({
  transaction_id: z.string(),
  amount: z.number(),
  category: z.array(z.string()).optional(),
  date: z.string(),
  name: z.string(),
  pending: z.boolean(),
});

export const plaidInstitutionSchema = z.object({
  institution: z.string(),
  transactions: z.array(plaidTransactionSchema),
});

export const plaidTransactionsResponseSchema = z.object({
  institutions: z.array(plaidInstitutionSchema),
});

export type PlaidTransaction = z.infer<typeof plaidTransactionSchema>;
export type PlaidInstitution = z.infer<typeof plaidInstitutionSchema>;