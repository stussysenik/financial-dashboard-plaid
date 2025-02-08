import { User, InsertUser } from "@shared/schema";
import type { SessionStore } from "express-session";

export interface IStorage {
  sessionStore: SessionStore;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPlaidToken(userId: number, token: string): Promise<void>;
}
