"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { FIONA } from "@/lib/people";

export async function getFionaPtoBalance(): Promise<number | null> {
  try {
    const row = await prisma.ptoBalance.findUnique({ where: { personId: FIONA.id } });
    return row ? Number(row.currentDays) : null;
  } catch {
    return null;
  }
}

export async function setFionaPtoBalance(formData: FormData) {
  const days = Number(formData.get("days"));
  if (!Number.isFinite(days) || days < 0) return;

  try {
    await prisma.ptoBalance.upsert({
      where: { personId: FIONA.id },
      update: { currentDays: days },
      create: { personId: FIONA.id, currentDays: days },
    });
  } catch {
    return;
  }

  revalidatePath("/");
}
