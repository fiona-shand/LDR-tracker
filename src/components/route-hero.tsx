"use client";

import { motion } from "framer-motion";
import { Plane } from "lucide-react";
import { PEOPLE } from "@/lib/people";

export default function RouteHero() {
  const [you, partner] = PEOPLE;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-surface-border bg-surface px-8 py-12 shadow-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-soft via-transparent to-transparent" />
      <div className="relative flex flex-col items-center gap-10 sm:flex-row sm:justify-between sm:gap-6">
        <AirportChip city={you.airport.city} code={you.airport.iataCode} label={you.name} />

        <div className="relative flex h-8 w-full max-w-xs items-center sm:max-w-none sm:flex-1">
          <div className="h-px w-full border-t-2 border-dashed border-accent/30" />
          <motion.div
            className="absolute text-accent"
            initial={{ left: "0%" }}
            animate={{ left: "94%" }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut",
            }}
          >
            <Plane className="h-5 w-5 -translate-y-1/2 -rotate-45" />
          </motion.div>
        </div>

        <AirportChip
          city={partner.airport.city}
          code={partner.airport.iataCode}
          label={partner.name}
          align="end"
        />
      </div>
    </div>
  );
}

function AirportChip({
  city,
  code,
  label,
  align = "start",
}: {
  city: string;
  code: string;
  label: string;
  align?: "start" | "end";
}) {
  return (
    <div
      className={`flex flex-col items-center text-center sm:text-left ${
        align === "end" ? "sm:items-end sm:text-right" : "sm:items-start"
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-widest text-muted">
        {label}
      </span>
      <span className="text-4xl font-bold tracking-tight">{code}</span>
      <span className="text-sm text-muted">{city}</span>
    </div>
  );
}
