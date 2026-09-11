import { useState } from "react";

import { useAuth } from "../auth/AuthProvider";
import { BookDetailScreen } from "./BookDetailScreen";
import { BookFormScreen } from "./BookFormScreen";
import { BookListScreen } from "./BookListScreen";

type BookRoute =
  | { name: "list" }
  | { name: "detail"; id: string }
  | { name: "create" }
  | { name: "edit"; id: string };

export function BookScreen() {
  const { canWrite } = useAuth();
  const [route, setRoute] = useState<BookRoute>({ name: "list" });

  // Defense en profondeur : un role lecteur ne doit jamais atteindre les
  // ecrans d'ecriture, meme si les boutons qui y menent restent masques.
  if (!canWrite && (route.name === "create" || route.name === "edit")) {
    return (
      <BookListScreen
        onCreate={() => undefined}
        onOpenBook={(id) => setRoute({ name: "detail", id })}
      />
    );
  }

  if (route.name === "detail") {
    return (
      <BookDetailScreen
        id={route.id}
        onBack={() => setRoute({ name: "list" })}
        onDeleted={() => setRoute({ name: "list" })}
        onEdit={() => setRoute({ name: "edit", id: route.id })}
      />
    );
  }

  if (route.name === "create") {
    return (
      <BookFormScreen
        mode="create"
        onCancel={() => setRoute({ name: "list" })}
        onSaved={(id) => setRoute({ name: "detail", id })}
      />
    );
  }

  if (route.name === "edit") {
    return (
      <BookFormScreen
        id={route.id}
        mode="edit"
        onCancel={() => setRoute({ name: "detail", id: route.id })}
        onSaved={(id) => setRoute({ name: "detail", id })}
      />
    );
  }

  return (
    <BookListScreen
      onCreate={() => setRoute({ name: "create" })}
      onOpenBook={(id) => setRoute({ name: "detail", id })}
    />
  );
}
