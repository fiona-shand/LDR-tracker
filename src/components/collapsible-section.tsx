import { ChevronDown } from "lucide-react";

export default function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xl font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
        {title}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
