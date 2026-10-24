# Maple Market

A plain-English explorer for large TSX companies. Educational only. It does not trade and it does not predict prices.

```bash
pnpm install
pnpm dev
```

Useful scripts:

- `pnpm test` — scoring, finance, and data-layer tests
- `pnpm check:providers` — probe FMP, Twelve Data, Alpha Vantage, and unofficial Yahoo against RY.TO, SHOP.TO, and ENB.TO
- `pnpm seed:generate` — rewrite `src/lib/data/seed/tsx60.json` from `MARKET_DATA_PROVIDER`, or synthetic data if that provider is unavailable

Copy `.env.example` to `.env.local`. Keys stay on the server.
