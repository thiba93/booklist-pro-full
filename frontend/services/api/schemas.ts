import { z } from "zod";

export const bookSchema = z.object({
  id: z.string(),
  titre: z.string(),
  auteur: z.string(),
  editeur: z.string(),
  annee: z.number(),
  lu: z.boolean(),
  favori: z.boolean(),
  note: z.number().nullable(),
  couverture: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number()
});

export const booksPageSchema = z.object({
  items: z.array(bookSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number()
});

export const noteSchema = z.object({
  id: z.string(),
  livreId: z.string(),
  contenu: z.string(),
  createdAt: z.string()
});

export const healthSchema = z.object({
  statut: z.string(),
  version: z.string(),
  authRequise: z.boolean(),
  chaos: z.object({
    latence: z.number(),
    tauxEchec: z.number()
  }),
  livres: z.number(),
  notes: z.number()
});

export const statsSchema = z.object({
  total: z.number(),
  lus: z.number(),
  nonLus: z.number(),
  favoris: z.number(),
  moyenneNotes: z.number().nullable(),
  totalNotes: z.number(),
  distributionNotes: z.array(
    z.object({
      note: z.number(),
      total: z.number()
    })
  ),
  parAnnee: z.array(
    z.object({
      annee: z.number(),
      total: z.number()
    })
  ),
  parAuteur: z.array(
    z.object({
      auteur: z.string(),
      total: z.number()
    })
  ),
  genereLe: z.string()
});

export const utilisateurSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(["lecteur", "editeur"])
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.union([z.string(), z.number()]),
  utilisateur: utilisateurSchema
});

export const authRefreshResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.union([z.string(), z.number()])
});

export const meSchema = utilisateurSchema.extend({
  authRequise: z.boolean()
});

const syncResultIdSchema = z.string().nullable();

export const syncResponseSchema = z.object({
  resultats: z.array(
    z.discriminatedUnion("statut", [
      z.object({
        id: syncResultIdSchema,
        statut: z.literal("ok"),
        livre: bookSchema.nullable().optional(),
        supprime: z.boolean().optional(),
        rejeu: z.boolean().optional()
      }),
      z.object({
        id: syncResultIdSchema,
        statut: z.literal("conflit"),
        serveur: bookSchema,
        versionAttendue: z.number()
      }),
      z.object({
        id: syncResultIdSchema,
        statut: z.literal("erreur"),
        message: z.string().optional(),
        champs: z.record(z.string()).optional()
      })
    ])
  ),
  resume: z.object({
    total: z.number(),
    ok: z.number(),
    conflits: z.number(),
    erreurs: z.number()
  }),
  serveurLe: z.string()
});

export const emptyResponseSchema = z.undefined();
export const svgResponseSchema = z.string();

export type BooksPage = z.infer<typeof booksPageSchema>;
export type Note = z.infer<typeof noteSchema>;
export type Health = z.infer<typeof healthSchema>;
export type Stats = z.infer<typeof statsSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RefreshResponse = z.infer<typeof authRefreshResponseSchema>;
export type Me = z.infer<typeof meSchema>;
export type SyncResponse = z.infer<typeof syncResponseSchema>;
