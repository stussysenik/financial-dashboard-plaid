import { IStorage } from "./types";
import { User, InsertUser } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

interface PlaidConnection {
  accessToken: string;
  institutionId: string;
  institutionName: string;
}

// Helper function to hash password consistently
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private plaidConnections: Map<number, PlaidConnection[]>;
  sessionStore: Express.SessionStore;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.plaidConnections = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Create default admin user with consistent hashing
    this.initializeDefaultUser();
  }

  private async initializeDefaultUser() {
    const adminUser: User = {
      id: this.currentId++,
      username: "admin",
      password: await hashPassword("admin123"),
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

  async getPlaidConnections(userId: number): Promise<Array<PlaidConnection>> {
    return this.plaidConnections.get(userId) || [];
  }

  async createPlaidConnection(userId: number, connection: PlaidConnection): Promise<void> {
    try {
      const connections = this.plaidConnections.get(userId) || [];
      connections.push(connection);
      this.plaidConnections.set(userId, connections);
    } catch (error) {
      console.error('Error creating Plaid connection:', error);
      throw new Error('Failed to create Plaid connection');
    }
  }

  async clearAllData(): Promise<void> {
    try {
      this.users = new Map();
      this.plaidConnections = new Map();
      await this.initializeDefaultUser();
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error('Failed to clear test data');
    }
  }
}

export const storage = new MemStorage();