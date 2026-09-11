// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { ecouterReseau, estEnLigne } from "../services/reseau";

describe("reseau", () => {
  it("reflete navigator.onLine", () => {
    const spy = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    expect(estEnLigne()).toBe(false);
    spy.mockReturnValue(true);
    expect(estEnLigne()).toBe(true);
    spy.mockRestore();
  });

  it("notifie les transitions online/offline et se desabonne proprement", () => {
    const ecouteur = vi.fn();
    const arreter = ecouterReseau(ecouteur);

    window.dispatchEvent(new Event("offline"));
    expect(ecouteur).toHaveBeenLastCalledWith(false);

    window.dispatchEvent(new Event("online"));
    expect(ecouteur).toHaveBeenLastCalledWith(true);

    arreter();
    ecouteur.mockClear();
    window.dispatchEvent(new Event("offline"));
    expect(ecouteur).not.toHaveBeenCalled();
  });
});
