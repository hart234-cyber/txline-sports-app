# Database Migration Instructions

This app uses Drizzle ORM with PostgreSQL.

## Setup

1. Set a real `DATABASE_URL` in `.env.local` (or Vercel environment):
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/streakline
   ```

2. Push the schema:
   ```bash
   npm run db:push
   ```

3. Generate migration files (if modifying schema):
   ```bash
   npm run db:generate
   ```

4. Apply migrations:
   ```bash
   npm run db:migrate
   ```

## Without DATABASE_URL

The app gracefully falls back to `localStorage` for leaderboard and user sync. No database is required for demo/production operation.
