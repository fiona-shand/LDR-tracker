"use client";

import { useState, type ReactNode } from "react";

type Panel = "alternatives" | "visits" | "time-off";

const LABELS: { id: Panel; label: string }[] = [
  { id: "alternatives", label: "Alternatives" },
  { id: "visits", label: "Visits" },
  { id: "time-off", label: "Time off" },
];

export default function PlanSidePanel({
  alternatives,
  visits,
  timeOff,
}: {
  alternatives: ReactNode;
  visits: ReactNode;
  timeOff: ReactNode;
}) {
  const [active, setActive] = useState<Panel>("alternatives");
  const content = { alternatives, visits, "time-off": timeOff }[active];

  return (
    <section className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-sm">
      <div className="flex border-b border-surface-border p-1.5">
        {LABELS.map((panel) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => setActive(panel.id)}
            className={`flex-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors ${
              active === panel.id
                ? "bg-accent-soft text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {panel.label}
          </button>
        ))}
      </div>
      <div className="p-4">{content}</div>
    </section>
  );
}
