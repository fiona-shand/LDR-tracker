import { prisma } from "@/lib/db";
import { PEOPLE } from "@/lib/people";
import {
  fetchIcsText,
  labelForIcsUrl,
  normalizeIcsText,
  saveBusyBlocks,
  toFetchableIcsUrl,
} from "@/lib/ics-sync";
import { PLANNED_TRIPS_LABEL } from "@/lib/planned-trips";

const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

function configuredIcsUrl(personId: string): string | undefined {
  return process.env[`ICS_URL_${personId.toUpperCase()}`];
}

/**
 * Keeps each person's calendar synced from an ICS_URL_<PERSONID> env var, with
 * no UI step: whoever holds the Vercel project sets the env var once and this
 * runs quietly on page load whenever the last sync is stale.
 */
export async function ensureAutoSyncedCalendars() {
  for (const person of PEOPLE) {
    const rawUrl = configuredIcsUrl(person.id);
    if (!rawUrl) continue;

    let url: URL;
    try {
      url = toFetchableIcsUrl(rawUrl);
    } catch {
      continue;
    }

    let connection = await prisma.calendarConnection.findFirst({
      where: { personId: person.id, provider: "ICS", label: { not: PLANNED_TRIPS_LABEL } },
    });

    const stale =
      !connection ||
      connection.icsUrl !== url.toString() ||
      !connection.lastSyncedAt ||
      Date.now() - connection.lastSyncedAt.getTime() > STALE_AFTER_MS;

    if (!stale) continue;

    if (!connection) {
      connection = await prisma.calendarConnection.create({
        data: { personId: person.id, provider: "ICS", label: labelForIcsUrl(url), icsUrl: url.toString() },
      });
    } else if (connection.icsUrl !== url.toString()) {
      connection = await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: { label: labelForIcsUrl(url), icsUrl: url.toString() },
      });
    }

    try {
      const text = await fetchIcsText(url);
      const normalized = normalizeIcsText(text);
      await saveBusyBlocks(person.id, connection.id, normalized);
    } catch {
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: { lastSyncStatus: "error" },
      });
    }
  }
}
