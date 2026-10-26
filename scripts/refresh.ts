import { createYahooProvider } from "../src/lib/data/adapters/yahoo";
import { createCache } from "../src/lib/data/cache";
import { refreshCanadaSlice } from "../src/lib/data/refresh";
import { UNIVERSE } from "../src/lib/data/seed/universe";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

async function main(): Promise<void> {
  const result = await refreshCanadaSlice({
    cache: createCache(),
    yahoo: createYahooProvider(),
    symbols: UNIVERSE.map((company) => company.symbol),
  });
  console.log(`refreshed ${result.refreshed.length}, failed ${result.failed.length}`);
  if (result.failed.length > 0) console.log(result.failed.join(", "));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
