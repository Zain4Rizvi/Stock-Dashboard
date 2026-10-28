"use client";

import { setNavPending } from "@/components/shell/nav-pending";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const PRIMARY = [
  ["/", "Explore"],
  ["/start", "Start"],
  ["/heatmap", "Stocks"],
  ["/portfolio", "Portfolio"],
  ["/ask", "Ask"],
] as const;

const MORE = [
  ["/compare", "Compare"],
  ["/dividends", "Dividends"],
  ["/retirement", "Years from now"],
  ["/quiz", "Quiz"],
  ["/canada", "Canada"],
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const moreActive = MORE.some(([href]) => isActive(pathname, href));
  return (
    <header className="sticky top-0 z-30 border-b border-cream/10 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-maple text-sm font-semibold text-ink">M</span>
          <span className="font-display text-lg leading-none whitespace-nowrap">Maple Market</span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto text-sm" aria-label="Primary">
            {PRIMARY.map(([href, label]) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onMouseEnter={() => router.prefetch(href)}
                  className={`shrink-0 rounded-full px-2 py-1.5 whitespace-nowrap sm:px-3 ${active ? "bg-cream text-ink" : "text-mist hover:text-cream"}`}
                >
                  <NavLabel>{label}</NavLabel>
                </Link>
              );
            })}
          </nav>
          <details className="relative shrink-0 text-sm">
            <summary
              className={`cursor-pointer list-none rounded-full px-2 py-1.5 whitespace-nowrap sm:px-3 [&::-webkit-details-marker]:hidden ${moreActive ? "bg-cream text-ink" : "text-mist hover:text-cream"}`}
            >
              More
            </summary>
            <div className="absolute right-0 z-40 mt-2 grid w-48 gap-1 rounded-2xl border border-cream/15 bg-ink p-2 shadow-xl">
              {MORE.map(([href, label]) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onMouseEnter={() => router.prefetch(href)}
                    onClick={(event) => {
                      const details = event.currentTarget.closest("details");
                      if (details) details.open = false;
                    }}
                    className={`rounded-xl px-3 py-2 whitespace-nowrap ${active ? "bg-cream text-ink" : "text-mist hover:text-cream"}`}
                  >
                    <NavLabel>{label}</NavLabel>
                  </Link>
                );
              })}
            </div>
          </details>
        </div>
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
