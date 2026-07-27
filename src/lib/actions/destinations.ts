"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const addDestinationSchema = z.object({
  iataCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Must be a 3-letter IATA code"),
  cityName: z.string().trim().min(1).max(80),
});

export async function addDestination(formData: FormData) {
  const parsed = addDestinationSchema.safeParse({
    iataCode: formData.get("iataCode"),
    cityName: formData.get("cityName"),
  });

  if (!parsed.success) return;

  try {
    await prisma.destination.upsert({
      where: { iataCode: parsed.data.iataCode },
      update: { cityName: parsed.data.cityName },
      create: parsed.data,
    });
  } catch {
    return;
  }

  revalidatePath("/destinations");
  revalidatePath("/search");
}

export async function removeDestination(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  try {
    await prisma.destination.delete({ where: { id } });
  } catch {
    return;
  }

  revalidatePath("/destinations");
  revalidatePath("/search");
}
