# LDR Tracker

Finds weekends when two people (Fiona in MSP, Jake in LHR) are both free, and compares flight options — visiting each other, or meeting somewhere in between.

**Live:** https://ldr-tracker-zeta.vercel.app

## Pages

- **Calendar** — three-month view highlighting weekends both people are free; syncs automatically from each person's `.ics` calendar link (Apple public calendar, Google secret address), ignoring paydays, free-marked events, short online meetings, and public holidays. Trips together can be added by hand, with an optional airport code
- **Destinations** — shared wishlist of cities with typeahead search, plus the interests used to rank suggestions
- **Plan a trip** — ranked trip suggestions: a destination paired with dates, scored on the 5–6 week cadence, days together per PTO day, interest match, cost, and whose turn it is to travel. Live nonstop fares are fetched for the top few only. A weekend picker underneath prices a specific set of dates on demand
- **Compare** — cost and flight time per person and combined, plus a running tally of who has been doing the travelling

## Stack

- Next.js (App Router) + TypeScript, deployed on Vercel
- Postgres (Supabase) via Prisma
- Calendars synced from `ICS_URL_<PERSONID>` env vars (webcal/ICS feed), parsed with node-ical
- Bundled OurAirports dataset for destination search
- SerpApi's Google Flights engine for real fares (`SERPAPI_API_KEY`), restricted to nonstop and cached 12h per route+date to stay inside the 250-searches/month free tier; falls back to clearly-labelled placeholder fares if unconfigured. Booking links open a prefilled Google Flights search to complete the purchase.
  - Amadeus Self-Service was the original provider; that programme was decommissioned on 17 July 2026.

## Running it locally

Needs **Node 20+** and **Docker Desktop** (for the throwaway Postgres).

```bash
npm install
cp .env.example .env    # works as-is; no edits needed for local
npm run setup           # start Postgres, migrate, seed people, add demo data
npm run dev
```

Then open <http://localhost:3000>.

`npm run setup` is just these four in order, and each can be run on its own:

| Command | What it does |
| --- | --- |
| `npm run db:up` | Start local Postgres on port 5433 (`db:down` to stop) |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed the two people — safe against any database |
| `npm run db:demo` | Local demo data: planned trips, destinations, interests, PTO |

Without a `SERPAPI_API_KEY` the fares read "No fare found" and destination
photos fall back to a placeholder; everything else works.

<details>
<summary>Not using Docker?</summary>

Any local Postgres 16 works — [Postgres.app](https://postgresapp.com) or
`brew install postgresql@16`. Create the database and point `DATABASE_URL` at
it (default port is 5432, not 5433):

```bash
createdb ldr_tracker
# DATABASE_URL="postgresql://$USER@127.0.0.1:5432/ldr_tracker?schema=public"
npm run db:migrate && npm run db:seed && npm run db:demo
```
</details>

## Deploying

Deploys automatically from `main` via Vercel. Environment variables are managed in the Vercel project settings (`vercel env ls`), not from `.env`.

**Vercel does not run migrations.** After merging a schema change, apply it by
hand with the Supabase **Session pooler** URL (Settings → Database):

```bash
DATABASE_URL="<supabase session pooler url>" npx prisma migrate deploy
```

An inline `DATABASE_URL` takes precedence over `.env`, so this is safe to run
from the same checkout you develop in.

The trip-planner migration also needs a one-off backfill, which records where
each existing trip took place so the "whose turn is it" tally has something to
count:

```bash
DATABASE_URL="<supabase session pooler url>" npm run db:backfill
```
