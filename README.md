# LDR Tracker

Finds weekends when two people (Fiona in MSP, Jake in LHR) are both free, and compares flight options — visiting each other, or meeting somewhere in between.

**Live:** https://ldr-tracker-zeta.vercel.app

## Pages

- **Calendar** — three-month view highlighting weekends both people are free; upload a `.ics` calendar export per person
- **Destinations** — shared wishlist of cities, with city/airport typeahead search
- **Plan a trip** — pick a free weekend, compare fares side by side

## Stack

- Next.js (App Router) + TypeScript, deployed on Vercel
- Postgres (Supabase) via Prisma
- `.ics` calendar upload parsed with node-ical (Google Calendar OAuth sync still to come)
- Bundled OurAirports dataset for destination search
- Amadeus Self-Service API for flight search (not yet wired up — fares are currently placeholders)

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and the other values
npx prisma migrate dev
npx prisma db seed
npm run dev
```

See [`.env.example`](./.env.example) for the required environment variables.

## Deploying

Deploys automatically from `main` via Vercel. Environment variables are managed in the Vercel project settings (`vercel env ls`), not from `.env`.
