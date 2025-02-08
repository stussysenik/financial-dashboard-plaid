import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { plaidClient } from "./plaid-client";
import { CountryCode, Products } from "plaid";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Create a link token for Plaid Link
  app.post("/api/plaid/create-link-token", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const response = await plaidClient.linkTokenCreate({
        user: { client_user_id: req.user.id.toString() },
        client_name: "Financial Dashboard",
        products: [Products.Transactions],
        country_codes: [CountryCode.Us],
        language: "en",
      });
      res.json(response.data);
    } catch (error) {
      console.error("Error creating link token:", error);
      res.status(500).json({ error: "Failed to create link token" });
    }
  });

  // Exchange public token for access token
  app.post("/api/plaid/set-access-token", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const response = await plaidClient.itemPublicTokenExchange({
        public_token: req.body.public_token,
      });

      await storage.updateUserPlaidToken(req.user.id, response.data.access_token);
      res.json({ success: true });
    } catch (error) {
      console.error("Error exchanging token:", error);
      res.status(500).json({ error: "Failed to exchange token" });
    }
  });

  // Get accounts from Plaid
  app.get("/api/plaid/accounts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const user = await storage.getUser(req.user.id);
    if (!user?.plaidAccessToken) {
      return res.json({ accounts: [] });
    }

    try {
      const response = await plaidClient.accountsGet({
        access_token: user.plaidAccessToken,
      });
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  // Accounts
  app.get("/api/accounts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const accounts = await storage.getAccounts(req.user.id);
    res.json(accounts);
  });

  app.post("/api/accounts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const account = await storage.createAccount(req.user.id, req.body);
    res.status(201).json(account);
  });

  // Transactions
  app.get("/api/accounts/:accountId/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const transactions = await storage.getTransactions(parseInt(req.params.accountId));
    res.json(transactions);
  });

  app.post("/api/accounts/:accountId/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const transaction = await storage.createTransaction(
      parseInt(req.params.accountId),
      req.body
    );
    res.status(201).json(transaction);
  });

  const httpServer = createServer(app);
  return httpServer;
}