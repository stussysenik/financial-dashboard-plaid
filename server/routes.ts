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

  // Exchange public token and store institution data
  app.post("/api/plaid/set-access-token", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const tokenResponse = await plaidClient.itemPublicTokenExchange({
        public_token: req.body.public_token,
      });

      const institutionResponse = await plaidClient.institutionsGetById({
        institution_id: req.body.institution_id,
        country_codes: [CountryCode.Us],
      });

      await storage.createPlaidConnection(req.user.id, {
        accessToken: tokenResponse.data.access_token,
        institutionId: req.body.institution_id,
        institutionName: institutionResponse.data.institution.name,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error exchanging token:", error);
      res.status(500).json({ error: "Failed to exchange token" });
    }
  });

  // Get aggregated accounts data
  app.get("/api/plaid/accounts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const connections = await storage.getPlaidConnections(req.user.id);
    const accountsPromises = connections.map(async (connection) => {
      const response = await plaidClient.accountsGet({
        access_token: connection.accessToken,
      });
      return {
        institution: connection.institutionName,
        accounts: response.data.accounts,
      };
    });

    try {
      const results = await Promise.all(accountsPromises);
      res.json({ institutions: results });
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

  // Add this endpoint to get transactions across all accounts
  app.get("/api/plaid/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const connections = await storage.getPlaidConnections(req.user.id);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
      
      const transactionsPromises = connections.map(async (connection) => {
        const response = await plaidClient.transactionsGet({
          access_token: connection.accessToken,
          start_date: thirtyDaysAgo.toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
        });
        
        return {
          institution: connection.institutionName,
          transactions: response.data.transactions,
        };
      });

      const results = await Promise.all(transactionsPromises);
      res.json({ institutions: results });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}