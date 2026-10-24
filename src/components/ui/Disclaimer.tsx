export function Disclaimer({ prominent = false }: { prominent?: boolean }) {
  return (
    <p className={prominent ? "rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm leading-6 text-cream" : "text-xs leading-5 text-mist"}>
      Educational only, not financial advice. Maple Market does not buy or sell anything, and it does not predict where prices go.
    </p>
  );
}
