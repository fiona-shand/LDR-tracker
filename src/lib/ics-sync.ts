import * as ical from "node-ical";
import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";

const HORIZON_DAYS = 200;

function textValue(value: string | ical.ParameterValue | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.val;
}

type NormalizedEvent = {
  externalEventId: string;
  title?: string;
  startsAt: Date;
  endsAt: Date;
  isAllDay: boolean;
};

// Reminders that show up on the calendar but don't actually stop travel.
const NON_BLOCKING_TITLE_PATTERN = /\bpayday\b/i;
const VIDEO_CALL_LINK_PATTERN = /zoom\.us|meet\.google\.com|teams\.microsoft\.com|webex\.com|whereby\.com/i;
const MEETING_TITLE_PATTERN = /\b(meeting|call|sync|standup|stand-up|1:1|one-on-one|check-in)\b/i;
const SHORT_MEETING_MAX_MS = 4 * 60 * 60 * 1000;

/**
 * Whether an event should count as "unavailable" for weekend planning.
 * Filters out things that show up on a calendar but don't actually block
 * travel: paydays and similar reminders, events explicitly marked "free"
 * (iCal TRANSPARENT), and short online meetings that can be taken from
 * anywhere.
 */
function isBlockingEvent(details: {
  title?: string;
  location?: string;
  description?: string;
  transparency?: string;
  isAllDay: boolean;
  startsAt: Date;
  endsAt: Date;
}): boolean {
  if (details.transparency === "TRANSPARENT") return false;
  if (details.title && NON_BLOCKING_TITLE_PATTERN.test(details.title)) return false;

  const durationMs = details.endsAt.getTime() - details.startsAt.getTime();
  if (!details.isAllDay && durationMs <= SHORT_MEETING_MAX_MS) {
    const isOnlineMeeting =
      VIDEO_CALL_LINK_PATTERN.test(`${details.location ?? ""} ${details.description ?? ""}`) ||
      (!!details.title && MEETING_TITLE_PATTERN.test(details.title));
    if (isOnlineMeeting) return false;
  }

  return true;
}

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
        const title = textValue(instance.summary);
        if (
          !isBlockingEvent({
            title,
            location: textValue(instance.event.location),
            description: textValue(instance.event.description),
            transparency: instance.event.transparency,
            isAllDay: instance.isFullDay,
            startsAt: instance.start,
            endsAt: instance.end,
          })
        ) {
          continue;
        }
        normalized.push({
          externalEventId: `${event.uid}-${instance.start.toISOString()}`,
          title,
          startsAt: instance.start,
          endsAt: instance.end,
          isAllDay: instance.isFullDay,
        });
      }
      continue;
    }

    const endsAt = event.end ?? event.start;
    if (endsAt < today || event.start > horizonEnd) continue;

    const title = textValue(event.summary);
    const isAllDay = event.datetype === "date";
    if (
      !isBlockingEvent({
        title,
        location: textValue(event.location),
        description: textValue(event.description),
        transparency: event.transparency,
        isAllDay,
        startsAt: event.start,
        endsAt,
      })
    ) {
      continue;
    }

    normalized.push({
      externalEventId: event.uid ?? `${event.start.toISOString()}-${title ?? "event"}`,
      title,
      startsAt: event.start,
      endsAt,
      isAllDay,
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
