# LDR Tracker

Finds windows of time when two people are both free, and compares flight options from their respective home airports to shared destination cities during those windows — with PTO balance tracking.

## Stack

- Next.js (App Router) + TypeScript
- Postgres via Prisma
- Google Calendar API (OAuth, read-only) + iCloud private ICS feeds for calendar sync
- Amadeus Self-Service API for flight search

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and the other values
npx prisma migrate dev
npx prisma db seed
npm run dev
```

See [`.env.example`](./.env.example) for the required environment variables.
