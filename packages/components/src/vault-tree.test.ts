import { afterEach, describe, expect, it, vi } from "vitest";

import { loadNavigationEntries, type VaultTreeEntry } from "./vault-tree.js";

describe("loadNavigationEntries", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("caches successful navigation requests by endpoint", async () => {
    const entries: VaultTreeEntry[] = [{ slug: "index", title: "Home" }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 1, entries }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const endpoint = "/api/navigation?build=test-success";

    await expect(loadNavigationEntries(endpoint)).resolves.toEqual(entries);
    await expect(loadNavigationEntries(endpoint)).resolves.toEqual(entries);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("evicts failed navigation requests so callers can retry", async () => {
    const entries: VaultTreeEntry[] = [{ slug: "index", title: "Home" }];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: 1, entries }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const endpoint = "/api/navigation?build=test-retry";

    await expect(loadNavigationEntries(endpoint)).rejects.toThrow(
      "Failed to load navigation.",
    );
    await expect(loadNavigationEntries(endpoint)).resolves.toEqual(entries);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
