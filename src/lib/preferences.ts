import { prisma } from "@/lib/db";
import { CADENCE_MAX_WEEKS, CADENCE_MIN_WEEKS } from "@/lib/cadence";
import { parseInterests, type Interest } from "@/lib/interests";

export const PREFERENCES_ID = "singleton";

export type PlanningPreferences = {
  interests: Interest[];
  cadenceMinWeeks: number;
  cadenceMaxWeeks: number;
};

export const DEFAULT_PREFERENCES: PlanningPreferences = {
  interests: [],
  cadenceMinWeeks: CADENCE_MIN_WEEKS,
  cadenceMaxWeeks: CADENCE_MAX_WEEKS,
};

/**
 * Read-only, so it lives here rather than in the actions file -- exporting it
 * from a "use server" module would publish it as a callable endpoint for no
 * reason.
 */
export async function getPreferences(): Promise<PlanningPreferences> {
  try {
    const row = await prisma.preferences.findUnique({ where: { id: PREFERENCES_ID } });
    if (!row) return DEFAULT_PREFERENCES;
    return {
      interests: parseInterests(row.interests),
      cadenceMinWeeks: row.cadenceMinWeeks,
      cadenceMaxWeeks: row.cadenceMaxWeeks,
    };
  } catch {
    // No database (or it's down) -- plan with defaults rather than failing.
    return DEFAULT_PREFERENCES;
  }
}
