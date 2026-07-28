import * as ical from "node-ical";
import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";

const HORIZON_DAYS = 200;

function summaryText(summary: ical.VEvent["summary"]): string | undefined {
  if (!summary) return undefined;
  return typeof summary === "string" ? summary : summary.val;
}

type NormalizedEvent = {
  externalEventId: string;
  title?: string;
  startsAt: Date;
  endsAt: Date;
  isAllDay: boolean;
};

export function normalizeIcsText(text: string): NormalizedEvent[] {
  const parsed = ical.sync.parseICS(text);

  const today = startOfDay(new Date());
  const horizonEnd = addDays(today, HORIZON_DAYS);

  const events = Object.values(parsed).filter(
    (item): item is ical.VEvent => !!item && (item as ical.VEvent).type === "VEVENT",
  );

  const normalized: NormalizedEvent[] = [];

  for (const event of events) {
    if (!event.start) continue;

    if (event.rrule) {
      const instances = ical.expandRecurringEvent(event, { from: today, to: horizonEnd });
      for (const instance of instances) {
        normalized.push({
          externalEventId: `${event.uid}-${instance.start.toISOString()}`,
          title: summaryText(instance.summary),
          startsAt: instance.start,
          endsAt: instance.end,
          isAllDay: instance.isFullDay,
        });
      }
      continue;
    }

    const endsAt = event.end ?? event.start;
    if (endsAt < today || event.start > horizonEnd) continue;

    normalized.push({
      externalEventId:
        event.uid ?? `${event.start.toISOString()}-${summaryText(event.summary) ?? "event"}`,
      title: summaryText(event.summary),
      startsAt: event.start,
      endsAt,
      isAllDay: event.datetype === "date",
    });
  }

  return normalized;
}

export async function saveBusyBlocks(
  personId: string,
  connectionId: string,
  normalized: NormalizedEvent[],
) {
  await prisma.$transaction([
    prisma.busyBlock.deleteMany({ where: { calendarConnectionId: connectionId } }),
    prisma.busyBlock.createMany({
      data: normalized.map((e) => ({
        personId,
        calendarConnectionId: connectionId,
        externalEventId: e.externalEventId,
        title: e.title,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        isAllDay: e.isAllDay,
      })),
    }),
    prisma.calendarConnection.update({
      where: { id: connectionId },
      data: { lastSyncedAt: new Date(), lastSyncStatus: "ok" },
    }),
  ]);
}

const PRIVATE_HOSTNAME_PATTERN =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|\[?::1\]?)|(\.local)$/i;

function isPrivateHost(hostname: string): boolean {
  if (PRIVATE_HOSTNAME_PATTERN.test(hostname)) return true;
  const octets = hostname.match(/^172\.(\d{1,3})\./);
  if (octets) {
    const second = Number(octets[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

/** Normalizes webcal:// links (Apple/Google share links) to https:// and rejects anything unsafe to fetch. */
export function toFetchableIcsUrl(rawUrl: string): URL {
  const withScheme = rawUrl.trim().replace(/^webcal:\/\//i, "https://");
  const url = new URL(withScheme);
  if (url.protocol !== "https:") {
    throw new Error("Calendar link must use https:// (or webcal://)");
  }
  if (isPrivateHost(url.hostname)) {
    throw new Error("That calendar link isn't reachable from the server");
  }
  return url;
}

export function labelForIcsUrl(url: URL): string {
  const host = url.hostname.toLowerCase();
  if (host.endsWith("icloud.com")) return "Apple Calendar";
  if (host.endsWith("google.com")) return "Google Calendar";
  return "Calendar link";
}

export async function fetchIcsText(url: URL): Promise<string> {
  const res = await fetch(url, {
    headers: { Accept: "text/calendar, text/plain, */*" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Calendar link responded with ${res.status}`);
  }
  return res.text();
}
