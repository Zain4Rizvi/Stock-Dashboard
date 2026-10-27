import { Disclaimer } from "@/components/ui/Disclaimer";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-cream/10 px-4 py-3">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2">
        <Disclaimer />
        <p className="text-xs text-mist">
          <Link href="/canada" className="underline decoration-cream/30 underline-offset-2 hover:text-cream">
            Canadian accounts
          </Link>
          <span className="px-2" aria-hidden="true">
            ·
          </span>
          TSX names use the .TO ticker. Nothing here is an order.
        </p>
      </div>
    </footer>
  );
}
