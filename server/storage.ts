import { IStorage } from "./types";
import { User, InsertUser } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  sessionStore: session.SessionStore;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Create default admin user
    const adminUser: User = {
      id: this.currentId++,
      username: "admin",
      password: "c7ad44cbad762a5da0a452f9e854fdc1e0e7a52a38015f23f3eab1d80b931dd472634dfac71cd34ebc35d16ab7fb8a90c81f975113d6c7538dc69dd8de9077ec.d93591bdf7860e1e", // admin123
      plaidAccessToken: null,
    };
    this.users.set(adminUser.id, adminUser);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id, plaidAccessToken: null };
    this.users.set(id, user);
    return user;
  }

  async updateUserPlaidToken(userId: number, token: string): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      user.plaidAccessToken = token;
      this.users.set(userId, user);
    }
  }
}

export const storage = new MemStorage();