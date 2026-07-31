"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
    redirect("/settings?status=interests-error");
  }

  revalidatePath("/settings");
  revalidatePath("/");
  redirect("/settings?status=interests-saved");
}

export async function setCadence(formData: FormData) {
  const min = Number(formData.get("cadenceMinWeeks"));
  const max = Number(formData.get("cadenceMaxWeeks"));

  if (!Number.isFinite(min) || !Number.isFinite(max)) redirect("/settings?status=cadence-error");
  if (min < 1 || max < min || max > 52) redirect("/settings?status=cadence-error");

  try {
    await prisma.preferences.upsert({
      where: { id: PREFERENCES_ID },
      update: { cadenceMinWeeks: min, cadenceMaxWeeks: max },
      create: { id: PREFERENCES_ID, cadenceMinWeeks: min, cadenceMaxWeeks: max },
    });
  } catch {
    redirect("/settings?status=cadence-error");
  }

  revalidatePath("/");
  revalidatePath("/settings");
  redirect("/settings?status=cadence-saved");
}
