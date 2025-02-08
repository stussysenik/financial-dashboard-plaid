import { User, InsertUser } from "@shared/schema";
import type { Store } from "express-session";

export interface PlaidConnection {
  accessToken: string;
  institutionId: string;
  institutionName: string;
}

export interface IStorage {
  sessionStore: Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPlaidToken(userId: number, token: string): Promise<void>;
  getPlaidConnections(userId: number): Promise<PlaidConnection[]>;
  createPlaidConnection(userId: number, connection: PlaidConnection): Promise<void>;
  clearAllData?(): Promise<void>;
}
