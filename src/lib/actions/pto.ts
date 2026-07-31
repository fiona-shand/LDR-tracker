"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  if (!Number.isFinite(days) || days < 0) redirect("/settings?status=pto-error");

  try {
    await prisma.ptoBalance.upsert({
      where: { personId: FIONA.id },
      update: { currentDays: days },
      create: { personId: FIONA.id, currentDays: days },
    });
  } catch {
    redirect("/settings?status=pto-error");
  }

  revalidatePath("/");
  revalidatePath("/settings");
  redirect("/settings?status=pto-saved");
}
