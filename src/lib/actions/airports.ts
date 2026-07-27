"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const addAirportSchema = z.object({
  personId: z.string().min(1),
  iataCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Must be a 3-letter IATA code"),
  label: z.string().trim().max(60).optional(),
});

export async function addAirport(formData: FormData) {
  const parsed = addAirportSchema.safeParse({
    personId: formData.get("personId"),
    iataCode: formData.get("iataCode"),
    label: formData.get("label") || undefined,
  });

  if (!parsed.success) return;

  await prisma.airport.upsert({
    where: {
      personId_iataCode: {
        personId: parsed.data.personId,
        iataCode: parsed.data.iataCode,
      },
    },
    update: {},
    create: parsed.data,
  });

  revalidatePath("/settings/airports");
}

export async function removeAirport(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  await prisma.airport.delete({ where: { id } });
  revalidatePath("/settings/airports");
}
