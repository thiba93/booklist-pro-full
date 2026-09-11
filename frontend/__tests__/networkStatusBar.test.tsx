// @vitest-environment jsdom
import { act, create } from "react-test-renderer";
import { describe, expect, it } from "vitest";

import { NetworkStatusBar } from "../components/feedback/NetworkStatusBar";
import { AppProviders } from "./testProviders";

describe("NetworkStatusBar", () => {
  it("is permanently visible and reflects online/offline transitions", async () => {
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(
        <AppProviders>
          <NetworkStatusBar />
        </AppProviders>
      );
    });

    if (!screen) {
      throw new Error("Rendu indisponible");
    }

    expect(screen.root.findByProps({ children: "En ligne" })).toBeTruthy();

    await act(async () => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.root.findByProps({ children: "Hors ligne" })).toBeTruthy();

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.root.findByProps({ children: "En ligne" })).toBeTruthy();
  });

  it("shows pending mutations count and conflict state alongside connectivity", async () => {
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(
        <AppProviders>
          <NetworkStatusBar hasConflict pendingCount={3} />
        </AppProviders>
      );
    });

    expect(
      screen?.root.findByProps({ children: "En ligne · 3 mutation(s) en attente · Conflit a resoudre" })
    ).toBeTruthy();
  });
});
