import { Disclaimer } from "@/components/ui/Disclaimer";
import { shelfWeights } from "@/features/canada/shelf";
import { torontoDate } from "@/lib/data/session";
import { UNIVERSE } from "@/lib/data/seed/universe";
import { formatCad } from "@/lib/format";
import type { ExplorerItem } from "@/types/market";
import Link from "next/link";
import type { ReactNode } from "react";

function shelfAsOf(items: readonly ExplorerItem[]): string | null {
  const days = [...new Set(items.map((item) => torontoDate(item.asOf)).filter((day): day is string => day != null))].sort();
  if (days.length === 0) return null;
  if (days.length === 1) return days[0] ?? null;
  return `${days[0]} to ${days[days.length - 1]}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-3xl border border-cream/10 bg-pine/80 p-5">
      <h2 className="font-display text-3xl">{title}</h2>
      <div className="grid gap-3 leading-7">{children}</div>
      <p className="text-sm text-mist">The rules can change. This is not advice.</p>
    </section>
  );
}

export function CanadaDesk({ universe }: { universe: ExplorerItem[] }) {
  const asOf = shelfAsOf(universe);
  const weights = shelfWeights(universe.map((item) => ({ sector: item.sector, marketCap: item.marketCap }))).sort(
    (a, b) => b.weight - a.weight || a.sector.localeCompare(b.sector),
  );
  const quoted = new Map(universe.map((item) => [item.symbol, item]));
  const funds = UNIVERSE.filter((company) => company.kind === "fund");

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
      <header className="grid gap-3">
        <h1 className="font-display text-5xl">In Canada</h1>
        <p className="text-lg leading-8">
          TFSA, RRSP, and FHSA are account names a beginner hears first. They are tax rules about where an investment sits. This page does not pick an account for you.
        </p>
      </header>
      <Disclaimer prominent />

      <Section title="TFSA">
        <p>
          A Tax-Free Savings Account is a registered account. Money that goes in has already been taxed. Growth inside the account, and cash paid out of it, is not taxed again in Canada while you stay inside the contribution room the government sets.
        </p>
      </Section>

      <Section title="RRSP">
        <p>
          A Registered Retirement Savings Plan is a registered account people use for later years. A contribution can lower the income tax owed for the year it is made. Money taken out later is taxed as income. The room depends on earned income, and unused room can carry forward.
        </p>
      </Section>

      <Section title="FHSA">
        <p>
          A First Home Savings Account is a registered account meant for a first home. A contribution can lower taxable income, and a qualifying withdrawal for that home is not taxed. There is a lifetime limit. If the money is never used for a home, there are separate rules for moving it.
        </p>
      </Section>

      <Section title="Dividend tax credit">
        <p>
          Some Canadian companies pay dividends. In a regular taxable account, a dividend tax credit can lower the tax on that cash compared with interest. That is the general idea. The credit does not work the same way inside every registered account, and not every payment qualifies.
        </p>
      </Section>

      <Section title="US-listed withholding">
        <p>
          Dividends from shares and funds listed in the United States are sometimes reduced by a withholding tax before the cash arrives. How much is withheld, and whether that is the end of the story, can differ by account. A TFSA and an RRSP are not always treated the same way.
        </p>
      </Section>

      <Section title="This shelf, by size">
        <p>
          Share of market cap on this shelf. A bigger slice means more of the total value of the names listed here. It is not the weight of the S&P/TSX index. Names with no market cap are left out.
        </p>
        {asOf ? <p className="text-sm text-mist">As of {asOf}.</p> : null}
        {weights.length === 0 ? (
          <p>No market caps are on this shelf yet, so the mix stays blank.</p>
        ) : (
          <ul className="grid gap-3">
            {weights.map((row) => (
              <li key={row.sector}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{row.sector}</span>
                  <span className="text-mist">{row.weight.toFixed(1)}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-cream/10">
                  <div className="h-2 rounded-full bg-aurora" style={{ width: `${Math.min(row.weight, 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="A few Canadian funds">
        <p>
          A fund is a basket, so it does not get a company letter grade. Prices still come from the evening cron. These funds appear after the next weekday cron. Until a quote is saved, the price stays blank.
        </p>
        <ul className="grid gap-4">
          {funds.map((fund) => {
            const row = quoted.get(fund.symbol);
            return (
              <li key={fund.symbol} className="grid gap-1">
                <p className="font-medium">
                  {row ? (
                    <Link href={`/stock/${encodeURIComponent(fund.symbol)}`} className="hover:text-gold">
                      {fund.symbol}
                    </Link>
                  ) : (
                    fund.symbol
                  )}
                  <span className="text-mist"> · {fund.name}</span>
                </p>
                <p>{fund.blurb}</p>
                <p className="text-sm text-mist">{row ? formatCad(row.price) : "No quote yet."}</p>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
