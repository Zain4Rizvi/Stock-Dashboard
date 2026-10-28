import { Disclaimer } from "@/components/ui/Disclaimer";
import { MonthlyPicture } from "@/features/start/MonthlyPicture";
import { UNIVERSE } from "@/lib/data/seed/universe";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Start · Maple Market",
  description: "What a share is, how a broad fund differs from one company, and a portfolio.",
};

const MORE = [
  ["/compare", "Compare", "Put up to three companies side by side. The shape is a report card, not a winner."],
  ["/dividends", "Dividends", "A picture of cash a company pays out, if it pays any."],
  ["/retirement", "Years from now", "A classroom picture of money compounding. Not a promise."],
  ["/quiz", "Quiz", "Short questions. At the end you see the ones you missed."],
  ["/canada", "Canada", "Account names, dividend tax, and the funds on this shelf."],
] as const;

export default function Page() {
  const example = UNIVERSE.find((company) => company.symbol === "XEQT.TO" && company.kind === "fund");

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
      <header className="grid gap-3">
        <h1 className="font-display text-5xl">Start here</h1>
        <p className="text-lg leading-8">
          Three short steps. A share, then a broad fund beside one company, then a portfolio. Nothing on this path tells you what to buy.
        </p>
      </header>
      <Disclaimer prominent />

      <ol className="grid gap-4">
        <li className="grid gap-3 rounded-3xl border border-cream/10 bg-pine/80 p-5">
          <p className="text-sm text-gold">Step 1</p>
          <h2 className="font-display text-3xl">A share is a piece of one company</h2>
          <p className="leading-7">
            When a company is listed, it is split into shares. One share is a small piece of ownership in that one company. The price is what buyers and sellers agreed recently. It can fall. Owning a share is not a promise that the price will rise.
          </p>
        </li>

        <li className="grid gap-3 rounded-3xl border border-cream/10 bg-pine/80 p-5">
          <p className="text-sm text-gold">Step 2</p>
          <h2 className="font-display text-3xl">One company, or a broad fund</h2>
          <p className="leading-7">
            A share of one company moves with that one business. A fund is a basket packed into a single share. A fund such as a stock-and-bond fund holds many stocks and bonds together, so one bad year at one company is not the whole story. The basket can still fall. This page does not tell you to buy a fund.
          </p>
          {example ? (
            <p className="leading-7">
              On this shelf,{" "}
              <Link href={`/stock/${example.symbol}`} className="text-gold underline decoration-cream/30 underline-offset-2">
                {example.name} ({example.symbol})
              </Link>{" "}
              is one example of a broad fund. It holds stocks from around the world, which is a different mix from a stock-and-bond fund. Open it to see how a fund is described here. That link is an example, not a suggestion to buy it.
            </p>
          ) : null}
          <p className="leading-7">
            <Link href="/canada" className="text-gold underline decoration-cream/30 underline-offset-2">
              In Canada
            </Link>{" "}
            explains account names and lists the funds on this shelf.
          </p>
        </li>

        <li className="grid gap-3 rounded-3xl border border-cream/10 bg-pine/80 p-5">
          <p className="text-sm text-gold">Step 3</p>
          <h2 className="font-display text-3xl">A portfolio of shares you do not buy</h2>
          <p className="leading-7">
            The portfolio is a notebook of share counts. You can change the mix and look at a picture of it. Maple Market does not place an order.
          </p>
          <MonthlyPicture />
          <Link
            href="/portfolio"
            className="inline-flex w-fit items-center rounded-full bg-maple px-4 py-2 text-sm font-medium text-ink"
          >
            Open the portfolio
          </Link>
        </li>
      </ol>

      <section className="grid gap-3">
        <h2 className="font-display text-3xl">When you want another page</h2>
        <ul className="grid gap-3">
          {MORE.map(([href, label, detail]) => (
            <li key={href} className="rounded-2xl border border-cream/10 px-4 py-3">
              <Link href={href} className="font-medium text-gold underline decoration-cream/30 underline-offset-2">
                {label}
              </Link>
              <p className="mt-1 text-sm leading-6 text-mist">{detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
