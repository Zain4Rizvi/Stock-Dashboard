"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Explore"],
  ["/heatmap", "Heatmap"],
  ["/compare", "Compare"],
  ["/portfolio", "Portfolio"],
  ["/time-machine", "Replay"],
  ["/dividends", "Dividends"],
  ["/retirement", "Future"],
  ["/quiz", "Quiz"],
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-cream/10 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-maple text-sm font-semibold text-ink">M</span>
          <span className="font-display text-lg leading-none">Maple Market</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto text-sm" aria-label="Primary">
          {LINKS.map(([href, label]) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3 py-1.5 whitespace-nowrap ${active ? "bg-cream text-ink" : "text-mist hover:text-cream"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
