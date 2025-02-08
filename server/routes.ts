import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

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
