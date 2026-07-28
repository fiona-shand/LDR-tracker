"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { PEOPLE } from "@/lib/people";
import {
  fetchIcsText,
  labelForIcsUrl,
  normalizeIcsText,
  saveBusyBlocks,
  toFetchableIcsUrl,
} from "@/lib/ics-sync";

const PERSON_IDS = new Set<string>(PEOPLE.map((p) => p.id));

async function syncFromUrl(personId: string, connectionId: string, rawUrl: string) {
  const url = toFetchableIcsUrl(rawUrl);
  const text = await fetchIcsText(url);
  const normalized = normalizeIcsText(text);
  await saveBusyBlocks(personId, connectionId, normalized);
}

export async function connectCalendarUrl(formData: FormData) {
  const personId = formData.get("personId");
  const rawUrl = formData.get("url");

  if (typeof personId !== "string" || !PERSON_IDS.has(personId)) return;
  if (typeof rawUrl !== "string" || rawUrl.trim() === "") return;

  let connection = await prisma.calendarConnection.findFirst({
    where: { personId, provider: "ICS" },
  });

  let url: URL;
  try {
    url = toFetchableIcsUrl(rawUrl);
  } catch {
    return;
  }

  if (!connection) {
    connection = await prisma.calendarConnection.create({
      data: { personId, provider: "ICS", label: labelForIcsUrl(url), icsUrl: url.toString() },
    });
  } else {
    connection = await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: { label: labelForIcsUrl(url), icsUrl: url.toString() },
    });
  }

  try {
    await syncFromUrl(personId, connection.id, rawUrl);
  } catch {
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: { lastSyncStatus: "error" },
    });
  }

  revalidatePath("/");
  revalidatePath("/search");
}

export async function resyncCalendarConnection(formData: FormData) {
  const connectionId = formData.get("connectionId");
  if (typeof connectionId !== "string") return;

  const connection = await prisma.calendarConnection.findUnique({ where: { id: connectionId } });
  if (!connection || !connection.icsUrl) return;

  try {
    await syncFromUrl(connection.personId, connection.id, connection.icsUrl);
  } catch {
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: { lastSyncStatus: "error" },
    });
  }

  revalidatePath("/");
  revalidatePath("/search");
}
