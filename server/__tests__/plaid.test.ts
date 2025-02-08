import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { registerRoutes } from "../routes";
import { storage } from "../storage";
import { plaidClient } from "../plaid-client";

// Mock Plaid client responses
vi.mock("../plaid-client", () => ({
  plaidClient: {
    linkTokenCreate: vi.fn().mockResolvedValue({
      data: { link_token: "test_link_token" },
    }),
    itemPublicTokenExchange: vi.fn().mockResolvedValue({
      data: { access_token: "test_access_token" },
    }),
    institutionsGetById: vi.fn().mockResolvedValue({
      data: {
        institution: {
          name: "Test Bank",
        },
      },
    }),
    accountsGet: vi.fn().mockResolvedValue({
      data: {
        accounts: [
          {
            account_id: "test_account",
            name: "Checking",
            type: "depository",
            balances: {
              current: 1000,
            },
          },
        ],
      },
    }),
    transactionsGet: vi.fn().mockResolvedValue({
      data: {
        transactions: [
          {
            transaction_id: "test_tx",
            amount: -50,
            category: ["Food and Drink"],
            date: "2024-03-01",
            name: "Restaurant",
            pending: false,
          }
        ],
      },
    }),
  },
}));

describe("Plaid Integration", () => {
  const app = express();
  let authCookie: string;

  beforeEach(async () => {
    // Setup test user and get auth cookie
    storage.users.clear();
    await storage.createUser({
      username: "testuser",
      password: "test123",
    });

    const loginResponse = await request(app)
      .post("/api/login")
      .send({
        username: "testuser",
        password: "test123",
      });

    authCookie = loginResponse.headers["set-cookie"][0];
  });

  it("should create link token for authenticated user", async () => {
    const response = await request(app)
      .post("/api/plaid/create-link-token")
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("link_token");
  });

  it("should connect bank account successfully", async () => {
    const response = await request(app)
      .post("/api/plaid/set-access-token")
      .set("Cookie", authCookie)
      .send({
        public_token: "test_public_token",
        institution_id: "test_institution",
      });

    expect(response.status).toBe(200);
    
    // Verify account data is retrieved
    const accountsResponse = await request(app)
      .get("/api/plaid/accounts")
      .set("Cookie", authCookie);

    expect(accountsResponse.status).toBe(200);
    expect(accountsResponse.body.institutions).toHaveLength(1);
    expect(accountsResponse.body.institutions[0].accounts[0].balances.current).toBe(1000);
  });

  it("should fetch transactions across all accounts", async () => {
    // First connect a bank account
    await request(app)
      .post("/api/plaid/set-access-token")
      .set("Cookie", authCookie)
      .send({
        public_token: "test_public_token",
        institution_id: "test_institution",
      });

    // Then fetch transactions
    const response = await request(app)
      .get("/api/plaid/transactions")
      .set("Cookie", authCookie);

    expect(response.status).toBe(200);
    expect(response.body.institutions).toHaveLength(1);
    expect(response.body.institutions[0].transactions).toBeDefined();
  });
}); 