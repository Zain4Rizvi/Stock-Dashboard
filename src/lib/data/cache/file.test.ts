import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileCache } from "./file";
import { MemoryCache } from "./memory";

describe("cache", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  });

  it("expires memory entries", async () => {
    let now = 1_000;
    const cache = new MemoryCache(() => now);
    await cache.set("quote", { price: 10 }, 10);
    expect(await cache.get("quote")).toEqual({ price: 10 });
    now += 11_000;
    expect(await cache.get("quote")).toBeNull();
  });

  it("round-trips a file entry", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "maple-cache-"));
    directories.push(directory);
    const cache = new FileCache(directory);
    await cache.set("history:RY.TO", [1, 2, 3], 30);
    expect(await cache.get("history:RY.TO")).toEqual([1, 2, 3]);
  });
});
