import path from "node:path";

export function seedFilePath(): string {
  return path.join(process.cwd(), "src", "lib", "data", "seed", "tsx60.json");
}
