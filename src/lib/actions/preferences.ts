"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseInterests } from "@/lib/interests";
import { PREFERENCES_ID } from "@/lib/preferences";

export async function setInterests(formData: FormData) {
  const interests = parseInterests(formData.getAll("interests").map(String));

  try {
    await prisma.preferences.upsert({
      where: { id: PREFERENCES_ID },
      update: { interests },
      create: { id: PREFERENCES_ID, interests },
    });
  } catch {
    return;
  }

  revalidatePath("/settings");
  revalidatePath("/");
}

export async function setCadence(formData: FormData) {
  const min = Number(formData.get("cadenceMinWeeks"));
  const max = Number(formData.get("cadenceMaxWeeks"));

  if (!Number.isFinite(min) || !Number.isFinite(max)) return;
  if (min < 1 || max < min || max > 52) return;

  try {
    await prisma.preferences.upsert({
      where: { id: PREFERENCES_ID },
      update: { cadenceMinWeeks: min, cadenceMaxWeeks: max },
      create: { id: PREFERENCES_ID, cadenceMinWeeks: min, cadenceMaxWeeks: max },
    });
  } catch {
    return;
  }

  revalidatePath("/");
  revalidatePath("/settings");
}
