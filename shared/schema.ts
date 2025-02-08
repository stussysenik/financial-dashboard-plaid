import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  plaidAccessToken: text("plaid_access_token"),
});

// Simplified schema for single user system
export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
  })
  .extend({
    username: z.literal("admin"),
    password: z.string().min(4),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;