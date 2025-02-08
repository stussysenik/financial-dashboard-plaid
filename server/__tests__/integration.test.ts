import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { registerRoutes } from "../routes";
import { storage } from "../storage";
import { plaidClient } from "../plaid-client";
import { AccountType, PlaidApi, AccountBase, AccountBalance, TransactionsGetResponse } from "plaid";
import type { AxiosResponse } from "axios";

// Register routes before tests
const app = express();
registerRoutes(app);

// Define mock data once
const mockAccount: AccountBase = {
  account_id: "acc1",
  name: "Checking",
  mask: "1234",
  official_name: "Checking Account",
  type: AccountType.Depository,
  subtype: "checking",
  verification_status: null,
  persistent_account_id: "pa_1",
};

const mockBalance: AccountBalance = {
  available: 1500,
  current: 1500,
  limit: null,
  iso_currency_code: "USD",
  unofficial_currency_code: null,
};

const mockTransactions: AxiosResponse<TransactionsGetResponse> = {
  data: {
    accounts: [],
    item: {} as any,
    total_transactions: 3,
    transactions: [
      {
        transaction_id: "tx1",
        account_id: "acc1",
        amount: -50,
        category: ["Food and Drink"],
        date: "2024-03-01",
        name: "Restaurant",
        pending: false,
        iso_currency_code: "USD",
        unofficial_currency_code: null,
        merchant_name: "Restaurant",
        payment_channel: "IN_STORE",
        authorized_date: "2024-03-01",
      },
      {
        transaction_id: "tx2",
        account_id: "acc1",
        amount: -30,
        category: ["Shopping"],
        date: "2024-03-02",
        name: "Retail Store",
        pending: false,
        iso_currency_code: "USD",
        unofficial_currency_code: null,
        merchant_name: "Store",
        payment_channel: "IN_STORE",
        authorized_date: "2024-03-02",
      },
      {
        transaction_id: "tx3",
        account_id: "acc1",
        amount: 1000,
        category: ["Transfer"],
        date: "2024-03-03",
        name: "Deposit",
        pending: false,
        iso_currency_code: "USD",
        unofficial_currency_code: null,
        merchant_name: null,
        payment_channel: "OTHER",
        authorized_date: "2024-03-03",
      }
    ],
    request_id: "req1",
  },
  status: 200,
  statusText: "OK",
  headers: {},
  config: {} as any,
};

// Setup mocks
vi.mock("../plaid-client", () => ({
  plaidClient: {
    linkTokenCreate: vi.fn().mockResolvedValue({
      data: { link_token: "test_link_token" },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    }),
    itemPublicTokenExchange: vi.fn().mockResolvedValue({
      data: { access_token: "test_access_token" },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    }),
    transactionsGet: vi.fn().mockResolvedValue(mockTransactions),
    accountsGet: vi.fn().mockResolvedValue({
      data: {
        accounts: [{
          ...mockAccount,
          balances: mockBalance,
        }],
        item: {} as any,
        request_id: "req1",
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    }),
  },
}));

describe("Financial Dashboard Integration", () => {
  let authCookie: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    await storage.clearAllData?.();

    // Create and login test user
    await storage.createUser({
      username: "testuser",
      password: "test123",
    });

    const loginResponse = await request(app)
      .post("/api/login")
      .send({ username: "testuser", password: "test123" });
    
    authCookie = loginResponse.headers["set-cookie"][0];
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Account Connection Flow", () => {
    it("should connect multiple bank accounts and aggregate data", async () => {
      // Connect first bank
      await request(app)
        .post("/api/plaid/set-access-token")
        .set("Cookie", authCookie)
        .send({
          public_token: "test_token_1",
          institution_id: "inst_1",
        })
        .expect(200);

      // Connect second bank
      await request(app)
        .post("/api/plaid/set-access-token")
        .set("Cookie", authCookie)
        .send({
          public_token: "test_token_2",
          institution_id: "inst_2",
        })
        .expect(200);

      // Verify accounts are aggregated
      const accountsResponse = await request(app)
        .get("/api/plaid/accounts")
        .set("Cookie", authCookie)
        .expect(200);

      expect(accountsResponse.body.institutions).toHaveLength(2);
    });

    it("should calculate spending correctly across accounts", async () => {
      // Connect bank
      await request(app)
        .post("/api/plaid/set-access-token")
        .set("Cookie", authCookie)
        .send({
          public_token: "test_token_1",
          institution_id: "inst_1",
        });

      const response = await request(app)
        .get("/api/plaid/transactions")
        .set("Cookie", authCookie)
        .expect(200);

      // Type-safe spending calculation
      const totalSpending = response.body.institutions[0].transactions
        .filter((tx: TransactionsGetResponse['transactions'][0]) => tx.amount < 0)
        .reduce((sum: number, tx: TransactionsGetResponse['transactions'][0]) => 
          sum + Math.abs(tx.amount), 0);

      expect(totalSpending).toBe(80);
    });

    it("should handle Plaid API errors gracefully", async () => {
      // Simulate Plaid API error
      vi.mocked(plaidClient.transactionsGet).mockRejectedValueOnce(
        new Error("API rate limit exceeded")
      );

      const response = await request(app)
        .get("/api/plaid/transactions")
        .set("Cookie", authCookie)
        .expect(500);

      expect(response.body.error).toBe("Failed to fetch transactions");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid access tokens", async () => {
      vi.mocked(plaidClient.accountsGet).mockRejectedValueOnce(
        new Error("INVALID_ACCESS_TOKEN")
      );

      const response = await request(app)
        .get("/api/plaid/accounts")
        .set("Cookie", authCookie)
        .expect(500);

      expect(response.body.error).toBe("Failed to fetch accounts");
    });

    it("should handle transaction pagination", async () => {
      // Mock large transaction set
      const largeTransactionSet = {
        data: {
          transactions: Array(1000).fill(mockTransactions.data.transactions[0]),
        },
      };

      vi.mocked(plaidClient.transactionsGet).mockResolvedValueOnce(largeTransactionSet);

      const response = await request(app)
        .get("/api/plaid/transactions")
        .set("Cookie", authCookie)
        .expect(200);

      expect(response.body.institutions[0].transactions).toHaveLength(1000);
    });
  });
}); 