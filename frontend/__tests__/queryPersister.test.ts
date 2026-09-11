// @vitest-environment jsdom
import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { hydrateQueryClient, persistQueryClient } from "../services/storage/queryPersister";

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
}

async function flush(ms = 600) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("queryPersister", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("persists only book-related successful queries, filtering out other namespaces", async () => {
    const client = createClient();
    const arreter = persistQueryClient(client);

    client.setQueryData(["books", "list", { page: 1 }], { items: [{ id: "b1" }] });
    client.setQueryData(["stats"], { total: 42 });

    await flush();
    arreter();
    client.clear();

    await hydrateQueryClient(client);

    expect(client.getQueryData(["books", "list", { page: 1 }])).toEqual({
      items: [{ id: "b1" }]
    });
    expect(client.getQueryData(["stats"])).toBeUndefined();
  });

  it("survives a cold restart: a fresh QueryClient rehydrates from the persisted cache", async () => {
    const writer = createClient();
    const arreter = persistQueryClient(writer);

    writer.setQueryData(["books", "detail", { id: "b1" }], { id: "b1", titre: "Dune" });
    await flush();
    arreter();

    const reader = createClient();
    await hydrateQueryClient(reader);

    expect(reader.getQueryData(["books", "detail", { id: "b1" }])).toEqual({
      id: "b1",
      titre: "Dune"
    });
  });
});
