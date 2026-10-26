"use client";

import { setNavPending } from "@/components/shell/nav-pending";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const LINKS = [
  ["/", "Explore"],
  ["/heatmap", "Stocks"],
  ["/compare", "Compare"],
  ["/portfolio", "Portfolio"],
  ["/dividends", "Dividends"],
  ["/retirement", "Years from now"],
  ["/quiz", "Quiz"],
  ["/ask", "Ask"],
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
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
                onMouseEnter={() => router.prefetch(href)}
                className={`rounded-full px-3 py-1.5 whitespace-nowrap ${active ? "bg-cream text-ink" : "text-mist hover:text-cream"}`}
              >
                <NavLabel>{label}</NavLabel>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function NavLabel({ children }: { children: string }) {
  const { pending } = useLinkStatus();
  useEffect(() => {
    if (!pending) return;
    setNavPending(true);
    return () => setNavPending(false);
  }, [pending]);
  return <span className={pending ? "opacity-55" : undefined}>{children}</span>;
}
