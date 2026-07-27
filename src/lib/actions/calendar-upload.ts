"use server";

import { revalidatePath } from "next/cache";
import * as ical from "node-ical";
import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { PEOPLE } from "@/lib/people";

const PERSON_IDS = new Set<string>(PEOPLE.map((p) => p.id));
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

export async function uploadIcsCalendar(formData: FormData) {
  const personId = formData.get("personId");
  const file = formData.get("file");

  if (typeof personId !== "string" || !PERSON_IDS.has(personId)) return;
  if (!(file instanceof File) || file.size === 0) return;

  const text = await file.text();

  let parsed: ical.CalendarResponse;
  try {
    parsed = ical.sync.parseICS(text);
  } catch {
    return;
  }

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

  try {
    let connection = await prisma.calendarConnection.findFirst({
      where: { personId, provider: "ICS" },
    });
    if (!connection) {
      connection = await prisma.calendarConnection.create({
        data: { personId, provider: "ICS", label: "Uploaded calendar" },
      });
    }
    const connectionId = connection.id;

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
  } catch {
    return;
  }

  revalidatePath("/");
  revalidatePath("/search");
}
