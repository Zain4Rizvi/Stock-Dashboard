"use client";

import { formatCad } from "@/lib/format";
import { useState } from "react";

function dollars(raw: string): number {
  if (raw.trim() === "") return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function MonthlyPicture() {
  const [raw, setRaw] = useState("500");
  const amount = dollars(raw);
  const year = amount * 12;

  return (
    <div className="grid gap-3">
      <label className="grid w-fit gap-2 text-sm" htmlFor="monthly-set-aside">
        Dollars set aside each month
        <input
          id="monthly-set-aside"
          type="number"
          inputMode="decimal"
          min={0}
          step={50}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          className="w-36 rounded-2xl border border-cream/15 bg-ink px-3 py-2 text-cream outline-none"
        />
      </label>
      <div className="flex h-24 items-end gap-1" aria-hidden="true">
        {Array.from({ length: 12 }, (_, month) => (
          <div key={month} className="min-w-0 flex-1 rounded-t-md bg-aurora" style={{ height: `${((month + 1) / 12) * 100}%` }} />
        ))}
      </div>
      <p className="leading-7">
        {formatCad(amount)} a month adds up to {formatCad(year)} in one year, and {formatCad(year * 5)} in five years, if that same
        amount is set aside every month. The bars are only those deposits stacked. They are not a return, and they do not name
        something to buy.
      </p>
    </div>
  );
}
