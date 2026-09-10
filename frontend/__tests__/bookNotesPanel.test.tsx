// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import { BookNotesPanel } from "../features/books/BookNotesPanel";
import { createBookNote, deleteBookNote, getBookNotes } from "../services/api/booksApi";
import type { Note } from "../services/api/schemas";
import { AppProviders } from "./testProviders";

vi.mock("../services/api/booksApi", async () => {
  const actual = await vi.importActual<typeof import("../services/api/booksApi")>(
    "../services/api/booksApi"
  );

  return {
    ...actual,
    createBookNote: vi.fn(),
    deleteBookNote: vi.fn(),
    getBookNotes: vi.fn()
  };
});

const note: Note = {
  id: "note-1",
  livreId: "book-1",
  contenu: "Premiere lecture, tres bon rythme.",
  createdAt: "2026-01-01T10:30:00.000Z"
};

function formatNoteDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value)
  );
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
}

function Wrapper(props: { children: ReactNode; queryClient: QueryClient }) {
  return (
    <AppProviders>
      <QueryClientProvider client={props.queryClient}>{props.children}</QueryClientProvider>
    </AppProviders>
  );
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

describe("BookNotesPanel", () => {
  it("displays a timestamped note with a delete action", async () => {
    vi.mocked(getBookNotes).mockResolvedValue([note]);
    const queryClient = createClient();
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(
        <Wrapper queryClient={queryClient}>
          <BookNotesPanel bookId="book-1" />
        </Wrapper>
      );
    });

    await waitUntil(() => {
      expect(screen?.root.findByProps({ children: note.contenu })).toBeTruthy();
    });

    expect(screen?.root.findByProps({ children: formatNoteDate(note.createdAt) })).toBeTruthy();
    expect(screen?.root.findByProps({ accessibilityLabel: "Supprimer la note" })).toBeTruthy();
  });

  it("adds a note through the API and clears the input", async () => {
    vi.mocked(getBookNotes).mockResolvedValue([]);
    vi.mocked(createBookNote).mockResolvedValue({
      ...note,
      id: "note-2",
      contenu: "Nouvelle note"
    });
    const queryClient = createClient();
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(
        <Wrapper queryClient={queryClient}>
          <BookNotesPanel bookId="book-1" />
        </Wrapper>
      );
    });

    await waitUntil(() => {
      expect(screen?.root.findByProps({ children: "Aucune note" })).toBeTruthy();
    });

    const input = screen?.root.findByProps({ accessibilityLabel: "Nouvelle note de lecture" });
    act(() => {
      input?.props.onChangeText("Nouvelle note");
    });

    const submitButton = screen?.root.findByProps({ accessibilityLabel: "Ajouter la note" });

    await act(async () => {
      await submitButton?.props.onPress?.();
    });

    expect(createBookNote).toHaveBeenCalledWith("book-1", "Nouvelle note");

    await waitUntil(() => {
      const inputAfter = screen?.root.findByProps({ accessibilityLabel: "Nouvelle note de lecture" });
      expect(inputAfter?.props.value).toBe("");
    });
  });

  it("optimistically removes a note and rolls back when the server refuses", async () => {
    vi.mocked(getBookNotes).mockResolvedValue([note]);
    let rejectDelete: (error: Error) => void = () => undefined;
    vi.mocked(deleteBookNote).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectDelete = reject;
        })
    );
    const queryClient = createClient();
    let screen: ReturnType<typeof create> | undefined;

    await act(async () => {
      screen = create(
        <Wrapper queryClient={queryClient}>
          <BookNotesPanel bookId="book-1" />
        </Wrapper>
      );
    });

    await waitUntil(() => {
      expect(screen?.root.findByProps({ children: note.contenu })).toBeTruthy();
    });

    const deleteButton = screen?.root.findByProps({ accessibilityLabel: "Supprimer la note" });
    act(() => {
      deleteButton?.props.onPress();
    });

    await waitUntil(() => {
      expect(screen?.root.findAllByProps({ children: note.contenu })).toHaveLength(0);
    });

    await act(async () => {
      rejectDelete(new Error("refused"));
    });

    await waitUntil(() => {
      expect(screen?.root.findByProps({ children: note.contenu })).toBeTruthy();
    });
  });
});
