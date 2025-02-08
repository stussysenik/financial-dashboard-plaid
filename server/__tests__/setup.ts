import { beforeAll } from 'vitest';
import { config } from 'dotenv';
import path from 'path';

beforeAll(() => {
  // Load environment variables for tests
  config({
    path: path.resolve(__dirname, '../../.env.test')
  });

  // Set default test environment variables if not present
  process.env.PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID || 'test_client_id';
  process.env.PLAID_SECRET = process.env.PLAID_SECRET || 'test_secret';
  process.env.PLAID_ENV = process.env.PLAID_ENV || 'sandbox';
  process.env.REPL_ID = process.env.REPL_ID || 'test_session_secret';
}); 