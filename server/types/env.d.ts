declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PLAID_CLIENT_ID: string;
      PLAID_SECRET: string;
      PLAID_ENV: string;
      REPL_ID: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {}; 