import { describe, expect, it } from "vitest";

import { deciderSortMutationConflit } from "../domain/sync/resolutionConflits";

describe("deciderSortMutationConflit", () => {
  it("reapplies the local mutation when it is more recent than the server's last known update", () => {
    const decision = deciderSortMutationConflit({
      mutationCreeLe: "2026-01-01T12:00:05.000Z",
      serveurMisAJourLe: "2026-01-01T12:00:00.000Z"
    });

    expect(decision).toBe("reappliquer");
  });

  it("abandons the local mutation when the server's update is more recent", () => {
    const decision = deciderSortMutationConflit({
      mutationCreeLe: "2026-01-01T12:00:00.000Z",
      serveurMisAJourLe: "2026-01-01T12:00:05.000Z"
    });

    expect(decision).toBe("abandonner");
  });

  it("abandons on an exact tie (server truth wins by default when equally recent)", () => {
    const decision = deciderSortMutationConflit({
      mutationCreeLe: "2026-01-01T12:00:00.000Z",
      serveurMisAJourLe: "2026-01-01T12:00:00.000Z"
    });

    expect(decision).toBe("abandonner");
  });

  it("compares ISO-8601 timestamps lexically across millisecond boundaries", () => {
    const decision = deciderSortMutationConflit({
      mutationCreeLe: "2026-01-01T12:00:00.999Z",
      serveurMisAJourLe: "2026-01-01T12:00:01.000Z"
    });

    expect(decision).toBe("abandonner");
  });

  it("is a pure function: same input always yields the same output, no shared state", () => {
    const contexte = {
      mutationCreeLe: "2026-06-01T00:00:00.000Z",
      serveurMisAJourLe: "2026-05-01T00:00:00.000Z"
    };

    expect(deciderSortMutationConflit(contexte)).toBe(deciderSortMutationConflit(contexte));
  });
});
