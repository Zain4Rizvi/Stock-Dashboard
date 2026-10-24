import { existsSync, readFileSync } from "node:fs";

/** Next.js precedence for local scripts: .env, then .env.local overrides. */
export function loadEnvFiles(): void {
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, "");
      process.env[match[1]] = value;
    }
  }
}
