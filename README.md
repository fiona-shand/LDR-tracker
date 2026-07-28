# LDR Tracker

Finds weekends when two people (Fiona in MSP, Jake in LHR) are both free, and compares flight options — visiting each other, or meeting somewhere in between.

**Live:** https://ldr-tracker-zeta.vercel.app

## Pages

- **Calendar** — three-month view highlighting weekends both people are free; syncs automatically from each person's `.ics` calendar link (Apple public calendar, Google secret address), ignoring paydays, free-marked events, short online meetings, and public holidays
- **Destinations** — shared wishlist of cities, with city/airport typeahead search
- **Plan a trip** — pick a free weekend, compare real fares side by side, click through to book

## Stack

- Next.js (App Router) + TypeScript, deployed on Vercel
- Postgres (Supabase) via Prisma
- Calendars synced from `ICS_URL_<PERSONID>` env vars (webcal/ICS feed), parsed with node-ical
- Bundled OurAirports dataset for destination search
- Amadeus Self-Service API for real fares (`AMADEUS_CLIENT_ID`/`AMADEUS_CLIENT_SECRET`), cached a few hours per route; falls back to placeholder fares if unconfigured. Booking links go to a prefilled Google Flights search — Amadeus's self-service tier doesn't issue purchasable links.

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
