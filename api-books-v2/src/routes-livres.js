const express = require('express');
const crypto = require('crypto');
const { charger, sauvegarder } = require('./db');
const { validerLivre, creerLivre, appliquerMaj, interroger, maintenant } = require('./livres');
const { authentifier, ecrivain } = require('./middleware');

const routeur = express.Router();

/* ------------------------------------------------------------------ */
/* Livres                                                              */
/* ------------------------------------------------------------------ */

// GET /books?page=1&limit=20&q=&status=lu|nonlu&favori=true&sort=titre&order=asc
routeur.get('/books', authentifier(), (req, res) => {
  const { livres } = charger();
  res.json(interroger(livres, req.query));
});

routeur.get('/books/:id', authentifier(), (req, res) => {
  const livre = charger().livres.find((l) => l.id === req.params.id);
  if (!livre) return res.status(404).json({ erreur: 'introuvable', message: 'Livre inconnu.' });
  res.set('ETag', String(livre.version));
  res.json(livre);
});

routeur.post('/books', ecrivain(), (req, res) => {
  const { valeur, erreurs } = validerLivre(req.body ?? {});
  if (erreurs) return res.status(422).json({ erreur: 'validation', champs: erreurs });

  const db = charger();
  const livre = creerLivre(valeur);
  db.livres.push(livre);
  sauvegarder();

  res.status(201).set('ETag', String(livre.version)).json(livre);
});

// PUT /books/:id  —  If-Match: <version> pour la detection de conflit
function majLivre(req, res) {
  const db = charger();
  const index = db.livres.findIndex((l) => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ erreur: 'introuvable', message: 'Livre inconnu.' });

  const actuel = db.livres[index];
  const ifMatch = req.headers['if-match'];

  if (ifMatch !== undefined && Number(String(ifMatch).replace(/"/g, '')) !== actuel.version) {
    return res.status(409).json({
      erreur: 'conflit',
      message: 'Ce livre a ete modifie entre temps.',
      serveur: actuel,
      versionAttendue: actuel.version,
    });
  }

  const partiel = req.method === 'PATCH';
  const { valeur, erreurs } = validerLivre(req.body ?? {}, partiel);
  if (erreurs) return res.status(422).json({ erreur: 'validation', champs: erreurs });

  const livreMaj = appliquerMaj(actuel, valeur);
  db.livres[index] = livreMaj;
  sauvegarder();

  return res.set('ETag', String(livreMaj.version)).json(livreMaj);
}

routeur.put('/books/:id', ecrivain(), majLivre);
routeur.patch('/books/:id', ecrivain(), majLivre);

routeur.delete('/books/:id', ecrivain(), (req, res) => {
  const db = charger();
  const index = db.livres.findIndex((l) => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ erreur: 'introuvable', message: 'Livre inconnu.' });

  db.livres.splice(index, 1);
  db.notes = db.notes.filter((n) => n.livreId !== req.params.id);
  sauvegarder();

  res.status(204).end();
});

/* ------------------------------------------------------------------ */
/* Notes                                                               */
/* ------------------------------------------------------------------ */

routeur.get('/books/:id/notes', authentifier(), (req, res) => {
  const db = charger();
  if (!db.livres.some((l) => l.id === req.params.id)) {
    return res.status(404).json({ erreur: 'introuvable', message: 'Livre inconnu.' });
  }
  const notes = db.notes
    .filter((n) => n.livreId === req.params.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(notes);
});

routeur.post('/books/:id/notes', ecrivain(), (req, res) => {
  const db = charger();
  if (!db.livres.some((l) => l.id === req.params.id)) {
    return res.status(404).json({ erreur: 'introuvable', message: 'Livre inconnu.' });
  }

  const contenu = typeof req.body?.contenu === 'string' ? req.body.contenu.trim() : '';
  if (contenu.length === 0 || contenu.length > 1000) {
    return res.status(422).json({
      erreur: 'validation',
      champs: { contenu: 'contenu obligatoire, 1000 caracteres maximum' },
    });
  }

  const note = {
    id: crypto.randomUUID(),
    livreId: req.params.id,
    contenu,
    createdAt: maintenant(),
  };
  db.notes.push(note);
  sauvegarder();

  res.status(201).json(note);
});

routeur.delete('/books/:livreId/notes/:noteId', ecrivain(), (req, res) => {
  const db = charger();
  const index = db.notes.findIndex(
    (n) => n.id === req.params.noteId && n.livreId === req.params.livreId,
  );
  if (index === -1) return res.status(404).json({ erreur: 'introuvable', message: 'Note inconnue.' });

  db.notes.splice(index, 1);
  sauvegarder();
  res.status(204).end();
});

module.exports = routeur;
