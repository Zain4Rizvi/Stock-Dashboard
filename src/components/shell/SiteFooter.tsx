import { Disclaimer } from "@/components/ui/Disclaimer";

export function SiteFooter() {
  return (
    <footer className="border-t border-cream/10 px-4 py-3">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2">
        <Disclaimer />
        <p className="text-xs text-mist">TSX names use the .TO ticker. Nothing here is an order.</p>
      </div>
    </footer>
  );
}
