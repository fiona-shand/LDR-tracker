-- Record where each already-recorded trip took place.
--
-- Trips are stored as BusyBlock rows, which carry dates but no destination.
-- The fairness ledger needs a destination to work out who did the travelling,
-- so without this it reads 0/0/0 on any database that already had trips
-- before the Trip table existed.
--
-- Dates and titles are taken from the existing BusyBlock rows rather than
-- hardcoded, so this stays correct if the trips were edited by hand. Only the
-- destination mapping is supplied here. Trips that don't exist are simply not
-- inserted, and re-running changes nothing.
INSERT INTO "Trip" ("id", "externalEventId", "title", "destinationIataCode", "startsAt", "endsAt")
SELECT DISTINCT ON (b."externalEventId")
  'seed-' || b."externalEventId",
  b."externalEventId",
  COALESCE(NULLIF(TRIM(b."title"), ''), 'Trip together'),
  v.iata,
  b."startsAt",
  b."endsAt"
FROM "BusyBlock" b
JOIN (
  VALUES
    ('boston-2026-08', 'BOS'),
    ('london-2026-09', 'LHR'),
    ('minneapolis-2026-10', 'MSP'),
    ('london-2026-11-thanksgiving', 'LHR'),
    ('minneapolis-2027-01', 'MSP')
) AS v(ext, iata) ON v.ext = b."externalEventId"
ORDER BY b."externalEventId", b."startsAt"
ON CONFLICT ("externalEventId") DO NOTHING;
