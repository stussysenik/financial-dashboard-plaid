import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { registerRoutes } from "../routes";
import { storage } from "../storage";

describe("Authentication Flow", () => {
  const app = express();
  registerRoutes(app);

  beforeEach(async () => {
    // Clear storage and create test user
    storage.users.clear();
    await storage.createUser({
      username: "testuser",
      password: "test123",
    });
  });

  it("should login successfully with correct credentials", async () => {
    const response = await request(app)
      .post("/api/login")
      .send({
        username: "testuser",
        password: "test123",
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(response.body.username).toBe("testuser");
  });

  it("should fail login with incorrect credentials", async () => {
    const response = await request(app)
      .post("/api/login")
      .send({
        username: "testuser",
        password: "wrong",
      });

    expect(response.status).toBe(401);
  });

  it("should require authentication for protected routes", async () => {
    const response = await request(app).get("/api/plaid/accounts");
    expect(response.status).toBe(401);
  });
}); 