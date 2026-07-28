"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { PEOPLE } from "@/lib/people";
import { normalizeIcsText, saveBusyBlocks } from "@/lib/ics-sync";

const PERSON_IDS = new Set<string>(PEOPLE.map((p) => p.id));

export async function uploadIcsCalendar(formData: FormData) {
  const personId = formData.get("personId");
  const file = formData.get("file");

  if (typeof personId !== "string" || !PERSON_IDS.has(personId)) return;
  if (!(file instanceof File) || file.size === 0) return;

  const text = await file.text();

  let normalized;
  try {
    normalized = normalizeIcsText(text);
  } catch {
    return;
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

    await saveBusyBlocks(personId, connection.id, normalized);
  } catch {
    return;
  }

  revalidatePath("/");
  revalidatePath("/search");
}
