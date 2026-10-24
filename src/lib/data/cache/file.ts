import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Cache } from "./types";

interface Envelope {
  expires: number;
  value: unknown;
}

export class FileCache implements Cache {
  constructor(
    private readonly directory: string,
    private readonly now: () => number = Date.now,
  ) {}

  private fileFor(key: string): string {
    const hash = createHash("sha1").update(key).digest("hex");
    return path.join(this.directory, `${hash}.json`);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await readFile(this.fileFor(key), "utf8");
      const parsed = JSON.parse(raw) as Envelope;
      if (typeof parsed.expires !== "number" || parsed.expires <= this.now()) {
        await this.delete(key);
        return null;
      }
      return parsed.value as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const envelope: Envelope = {
      expires: this.now() + ttlSeconds * 1000,
      value,
    };
    await writeFile(this.fileFor(key), JSON.stringify(envelope));
  }

  async delete(key: string): Promise<void> {
    await rm(this.fileFor(key), { force: true });
  }
}
