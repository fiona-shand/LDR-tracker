"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const LINKS = [
  { href: "/", label: "Calendar" },
  { href: "/destinations", label: "Destinations" },
  { href: "/search", label: "Plan a trip" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative rounded-full px-3 py-1.5 transition-colors ${
              active ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {active && (
              <motion.span
                layoutId="nav-active-pill"
                className="absolute inset-0 rounded-full bg-accent-soft"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <span className={`relative ${active ? "font-medium" : ""}`}>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
