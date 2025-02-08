# Multi-Bank Financial Dashboard

A real-time financial dashboard that aggregates data across multiple bank accounts using Plaid.

## Features
- Connect multiple bank accounts
- View total balance across all accounts
- Real-time transaction updates
- Institution-specific account views

## Implementation Details
1. Database Schema
   - Users table for authentication
   - PlaidConnections table for multiple bank connections
   - Stores institution metadata

2. API Endpoints
   - /api/plaid/set-access-token: Connect new bank account
   - /api/plaid/accounts: Get aggregated account data
   
3. UI Components
   - Dashboard with total balance
   - Institution-specific sections
   - Account cards with real-time updates

## Setup
1. Configure environment variables:
   ```env
   PLAID_CLIENT_ID=your_client_id
   PLAID_SECRET=your_secret
   PLAID_ENV=sandbox
   ```

2. Run migrations:
   ```bash
   npm run db:push
   ```

3. Start the development server:
   ```bash
   npm run dev
   ``` 