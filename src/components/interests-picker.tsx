import { setInterests } from "@/lib/actions/preferences";
import { INTEREST_LABELS, INTERESTS, type Interest } from "@/lib/interests";
import SubmitButton from "@/components/submit-button";

/**
 * Checkbox group written straight to Preferences by a server action -- no
 * client JS. Unchecked boxes simply don't submit, so saving with none ticked
 * correctly clears the list.
 */
export default function InterestsPicker({ chosen }: { chosen: Interest[] }) {
  const selected = new Set(chosen);

  return (
    <form
      action={setInterests}
      className="rounded-2xl border border-surface-border bg-surface p-5 shadow-sm"
    >
      <p className="font-medium">What are you both into?</p>
      <p className="mt-1 text-sm text-muted">
        Used to rank suggested trips on the Plan a trip page.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {INTERESTS.map((interest) => (
          <label
            key={interest}
            className="group cursor-pointer select-none"
          >
            <input
              type="checkbox"
              name="interests"
              value={interest}
              defaultChecked={selected.has(interest)}
              className="peer sr-only"
            />
            <span className="flex items-center rounded-full border border-surface-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface">
              {INTEREST_LABELS[interest]}
            </span>
          </label>
        ))}
      </div>

      <SubmitButton
          className="mt-4 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-3 py-2 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
      >
        Save interests
      </SubmitButton>
    </form>
  );
}
