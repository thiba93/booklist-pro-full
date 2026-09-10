const express = require('express');
const { charger, sauvegarder } = require('./db');
const { maintenant } = require('./livres');
const { genererSvgPlaceholder, decoderImageBase64 } = require('./couvertures');
const { authentifier, ecrivain } = require('./middleware');

const routeur = express.Router();

/* ------------------------------------------------------------------ */
/* Couvertures                                                         */
/* ------------------------------------------------------------------ */

// GET /covers/:id.svg — vignette de substitution, toujours disponible.
routeur.get('/covers/:id.svg', authentifier(), (req, res) => {
  const livre = charger().livres.find((l) => l.id === req.params.id);
  if (!livre) return res.status(404).json({ erreur: 'introuvable', message: 'Livre inconnu.' });

  res.set('Content-Type', 'image/svg+xml').set('Cache-Control', 'public, max-age=3600');
  res.send(genererSvgPlaceholder(livre));
});

// GET /media/:id.png — image televersee pour ce livre (suffixe fige, cf. resolveCoverUrl).
routeur.get('/media/:id.png', authentifier(), (req, res) => {
  const db = charger();
  const media = db.media[req.params.id];
  if (!media) return res.status(404).json({ erreur: 'introuvable', message: 'Couverture inconnue.' });

  res.set('Content-Type', media.mime).set('Cache-Control', 'private, max-age=60');
  res.send(Buffer.from(media.base64, 'base64'));
});

routeur.post('/books/:id/cover', ecrivain(), (req, res) => {
  const db = charger();
  const index = db.livres.findIndex((l) => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ erreur: 'introuvable', message: 'Livre inconnu.' });

  const decode = decoderImageBase64(req.body?.base64);
  if (decode.erreur) {
    return res.status(422).json({ erreur: 'validation', champs: { base64: decode.erreur } });
  }

  db.media[req.params.id] = { base64: decode.base64, mime: decode.mime, majLe: maintenant() };

  const actuel = db.livres[index];
  const livreMaj = {
    ...actuel,
    couverture: `/media/${req.params.id}.png`,
    updatedAt: maintenant(),
    version: actuel.version + 1,
  };
  db.livres[index] = livreMaj;
  sauvegarder();

  res.set('ETag', String(livreMaj.version)).json(livreMaj);
});

routeur.delete('/books/:id/cover', ecrivain(), (req, res) => {
  const db = charger();
  const index = db.livres.findIndex((l) => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ erreur: 'introuvable', message: 'Livre inconnu.' });

  delete db.media[req.params.id];

  const actuel = db.livres[index];
  const livreMaj = { ...actuel, couverture: null, updatedAt: maintenant(), version: actuel.version + 1 };
  db.livres[index] = livreMaj;
  sauvegarder();

  res.set('ETag', String(livreMaj.version)).json(livreMaj);
});

module.exports = routeur;
