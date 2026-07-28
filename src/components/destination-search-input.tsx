"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Search } from "lucide-react";
import { searchAirports, type AirportResult } from "@/lib/airport-search";

export default function DestinationSearchInput() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AirportResult | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const results = selected ? [] : searchAirports(query);

  function choose(option: AirportResult) {
    setSelected(option);
    setQuery(
      option.isMetro
        ? `${option.cityName} (all airports)`
        : `${option.cityName} (${option.iataCode})`,
    );
    setOpen(false);
  }

  function handleChange(value: string) {
    setQuery(value);
    setSelected(null);
    setHighlight(0);
    setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input type="hidden" name="cityName" value={selected?.cityName ?? ""} />
      <input type="hidden" name="iataCode" value={selected?.iataCode ?? ""} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => !selected && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Search a city, e.g. Tokyo"
          autoComplete="off"
          className="w-full rounded-lg border border-surface-border bg-background py-2 pl-9 pr-3 outline-none transition-colors focus:border-accent"
        />
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute z-20 mt-1 max-h-64 w-full origin-top overflow-auto rounded-lg border border-surface-border bg-surface py-1 shadow-lg"
          >
            {results.map((option, i) => (
              <li key={option.iataCode + option.name}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(option)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    i === highlight ? "bg-accent-soft text-accent" : "hover:bg-accent-soft/50"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">
                    {option.isMetro ? (
                      <>
                        {option.cityName}
                        <span className="text-muted"> (all airports)</span>
                      </>
                    ) : (
                      <>
                        {option.cityName}
                        <span className="text-muted"> — {option.name}</span>
                      </>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted">{option.iataCode}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}

        {open && !selected && query.trim().length >= 2 && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute z-20 mt-1 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-muted shadow-lg"
          >
            No matches
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
