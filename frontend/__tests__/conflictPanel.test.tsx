// @vitest-environment jsdom
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictPanel } from "../features/sync/ConflictPanel";
import { syncBooks } from "../services/api/systemApi";
import {
  enfilerModificationOuvrage,
  marquerStatutMutation,
  obtenirFileMutations,
  reinitialiserFileMutationsPourTests
} from "../services/sync/mutationQueue";
import { AppProviders } from "./testProviders";

vi.mock("../services/api/systemApi", async () => {
  const actual = await vi.importActual<typeof import("../services/api/systemApi")>(
    "../services/api/systemApi"
  );

  return { ...actual, syncBooks: vi.fn() };
});

const livreServeur = {
  id: "book-2",
  titre: "Dune Messiah",
  auteur: "Frank Herbert",
  editeur: "",
  annee: 1969,
  lu: false,
  favori: false,
  note: null,
  couverture: null,
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: "2020-06-01T00:00:00.000Z",
  version: 4
};

function enqueuerConflit(
  id: string,
  extra?: { serveur?: unknown; versionAttendue?: number },
  livreId = "book-2"
) {
  enfilerModificationOuvrage(id, livreId, { titre: "X", auteur: "Y", annee: 2000 }, 3);
  marquerStatutMutation(id, "conflit", extra);
}

async function waitUntil(assertion: () => void) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 1000) {
    try {
      assertion();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  assertion();
}

describe("ConflictPanel", () => {
  beforeEach(() => {
    reinitialiserFileMutationsPourTests();
    vi.mocked(syncBooks).mockReset();
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing when there is no conflict", async () => {
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(
        <AppProviders>
          <ConflictPanel />
        </AppProviders>
      );
    });

    expect(screen?.toJSON()).toBeNull();
  });

  it("shows the server title and both resolution actions for a fresh conflict", async () => {
    enqueuerConflit("m1", { serveur: livreServeur, versionAttendue: 4 });
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(
        <AppProviders>
          <ConflictPanel />
        </AppProviders>
      );
    });

    expect(
      screen?.root.findByProps({
        children: "\"Dune Messiah\" a ete modifie ailleurs entre-temps. Votre modification hors ligne n'a pas ete appliquee."
      })
    ).toBeTruthy();
    expect(screen?.root.findByProps({ accessibilityLabel: "Garder la version du serveur" })).toBeTruthy();
    expect(screen?.root.findByProps({ accessibilityLabel: "Reappliquer ma modification" })).toBeTruthy();
  });

  it("only offers 'keep server version' for a degraded conflict (no known server version)", async () => {
    enqueuerConflit("m1");
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(
        <AppProviders>
          <ConflictPanel />
        </AppProviders>
      );
    });

    expect(screen?.root.findByProps({ accessibilityLabel: "Garder la version du serveur" })).toBeTruthy();
    expect(screen?.root.findAllByProps({ accessibilityLabel: "Reappliquer ma modification" })).toHaveLength(0);
  });

  it("dismisses the conflict when 'keep server version' is pressed", async () => {
    enqueuerConflit("m1", { serveur: livreServeur, versionAttendue: 4 });
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(
        <AppProviders>
          <ConflictPanel />
        </AppProviders>
      );
    });

    act(() => {
      screen?.root.findByProps({ accessibilityLabel: "Garder la version du serveur" }).props.onPress();
    });

    expect(obtenirFileMutations()).toHaveLength(0);
  });

  it("shows every accumulated conflict at once and a 'dismiss all' shortcut, distinct from a single-card dismiss", async () => {
    enqueuerConflit("m1", { serveur: livreServeur, versionAttendue: 4 }, "book-2");
    enqueuerConflit("m2", undefined, "book-3");
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(
        <AppProviders>
          <ConflictPanel />
        </AppProviders>
      );
    });

    // Les deux cartes sont visibles simultanement, pas l'une apres l'autre.
    expect(
      screen?.root.findByProps({
        children: "\"Dune Messiah\" a ete modifie ailleurs entre-temps. Votre modification hors ligne n'a pas ete appliquee."
      })
    ).toBeTruthy();
    expect(
      screen?.root.findByProps({
        children: "Cet ouvrage a ete modifie ailleurs entre-temps. Votre modification hors ligne n'a pas ete appliquee."
      })
    ).toBeTruthy();
    const dismissAll = screen?.root.findByProps({ accessibilityLabel: "Tout ignorer" });
    expect(dismissAll).toBeTruthy();

    act(() => {
      dismissAll?.props.onPress();
    });

    expect(obtenirFileMutations()).toHaveLength(0);
  });

  it("does not offer 'dismiss all' when there is only a single conflict", async () => {
    enqueuerConflit("m1", { serveur: livreServeur, versionAttendue: 4 });
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(
        <AppProviders>
          <ConflictPanel />
        </AppProviders>
      );
    });

    expect(screen?.root.findAllByProps({ accessibilityLabel: "Tout ignorer" })).toHaveLength(0);
  });

  it("rebases and retries when 'reapply' is pressed, clearing the conflict on success", async () => {
    enqueuerConflit("m1", { serveur: livreServeur, versionAttendue: 4 });
    // rebaserMutationOuvrage genere un nouvel id (voir mutationQueue.ts) :
    // la reponse mockee doit refleter l'id REELLEMENT envoye, pas "m1".
    vi.mocked(syncBooks).mockImplementation(async (mutations) => ({
      resultats: [{ id: mutations[0]?.id ?? "", statut: "ok", livre: null }],
      resume: { total: 1, ok: 1, conflits: 0, erreurs: 0 },
      serveurLe: "2026-01-01T00:00:00.000Z"
    }));

    let screen: ReturnType<typeof create> | undefined;
    await act(async () => {
      screen = create(
        <AppProviders>
          <ConflictPanel />
        </AppProviders>
      );
    });

    await act(async () => {
      screen?.root.findByProps({ accessibilityLabel: "Reappliquer ma modification" }).props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const idEnvoye = vi.mocked(syncBooks).mock.calls[0]?.[0][0]?.id;
    expect(idEnvoye).not.toBe("m1");
    expect(vi.mocked(syncBooks).mock.calls[0]?.[0]).toMatchObject([{ baseVersion: 4 }]);
    await waitUntil(() => expect(obtenirFileMutations()).toHaveLength(0));
  });
});
