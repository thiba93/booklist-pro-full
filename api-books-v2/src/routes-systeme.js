const express = require('express');
const bcrypt = require('bcryptjs');
const { charger, sauvegarder } = require('./db');
const { validerLivre, creerLivre, appliquerMaj, maintenant } = require('./livres');
const {
  authentifier,
  ecrivain,
  signerAcces,
  signerRefresh,
  verifierRefresh,
  AUTH_REQUISE,
  TTL_ACCES,
} = require('./middleware');

const routeur = express.Router();

/* ------------------------------------------------------------------ */
/* Authentification (palier 18)                                        */
/* ------------------------------------------------------------------ */

routeur.post('/auth/login', (req, res) => {
  const { email, motDePasse } = req.body ?? {};
  const utilisateur = charger().utilisateurs.find(
    (u) => u.email.toLowerCase() === String(email || '').toLowerCase(),
  );

  const valide = utilisateur && bcrypt.compareSync(String(motDePasse || ''), utilisateur.hash);
  if (!valide) {
    // Meme reponse dans les deux cas : ne pas revéler l'existence du compte.
    return res
      .status(401)
      .json({ erreur: 'identifiants_invalides', message: 'Email ou mot de passe incorrect.' });
  }

  res.json({
    accessToken: signerAcces(utilisateur),
    refreshToken: signerRefresh(utilisateur),
    expiresIn: TTL_ACCES,
    utilisateur: { id: utilisateur.id, email: utilisateur.email, role: utilisateur.role },
  });
});

routeur.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) {
    return res.status(400).json({ erreur: 'refresh_absent', message: 'refreshToken manquant.' });
  }

  let charge;
  try {
    charge = verifierRefresh(refreshToken);
  } catch {
    return res
      .status(401)
      .json({ erreur: 'refresh_invalide', message: 'Jeton de rafraichissement invalide.' });
  }

  const utilisateur = charger().utilisateurs.find((u) => u.id === charge.sub);
  if (!utilisateur) {
    return res.status(401).json({ erreur: 'refresh_invalide', message: 'Utilisateur inconnu.' });
  }

  res.json({ accessToken: signerAcces(utilisateur), expiresIn: TTL_ACCES });
});

routeur.get('/me', authentifier(), (req, res) => {
  res.json({ ...req.utilisateur, authRequise: AUTH_REQUISE });
});

/* ------------------------------------------------------------------ */
/* Statistiques                                                        */
/* ------------------------------------------------------------------ */

routeur.get('/stats', authentifier(), (req, res) => {
  const { livres, notes } = charger();

  const notees = livres.filter((l) => typeof l.note === 'number');
  const moyenne = notees.length
    ? Number((notees.reduce((s, l) => s + l.note, 0) / notees.length).toFixed(2))
    : null;

  const grouper = (cle) => {
    const map = new Map();
    for (const l of livres) map.set(l[cle], (map.get(l[cle]) || 0) + 1);
    return [...map.entries()]
      .map(([valeur, total]) => ({ valeur, total }))
      .sort((a, b) => b.total - a.total);
  };

  const lus = livres.filter((l) => l.lu).length;

  res.json({
    total: livres.length,
    lus,
    nonLus: livres.length - lus,
    favoris: livres.filter((l) => l.favori).length,
    moyenneNotes: moyenne,
    totalNotes: notes.length,
    distributionNotes: [0, 1, 2, 3, 4, 5].map((n) => ({
      note: n,
      total: livres.filter((l) => Math.round(l.note ?? -1) === n).length,
    })),
    parAnnee: grouper('annee')
      .map((e) => ({ annee: e.valeur, total: e.total }))
      .sort((a, b) => a.annee - b.annee),
    parAuteur: grouper('auteur')
      .slice(0, 10)
      .map((e) => ({ auteur: e.valeur, total: e.total })),
    genereLe: maintenant(),
  });
});

/* ------------------------------------------------------------------ */
/* Synchronisation par lot (palier 18)                                 */
/* ------------------------------------------------------------------ */

/**
 * POST /sync
 * { mutations: [ { id, type: 'create'|'update'|'delete', livre, baseVersion } ] }
 *
 * - Idempotent : une mutation deja traitee (meme id) renvoie son resultat memorise.
 * - Les mutations sont traitees dans l'ordre recu.
 * - Un conflit n'interrompt pas le lot : chaque mutation a son propre statut.
 */
routeur.post('/sync', ecrivain(), (req, res) => {
  const mutations = Array.isArray(req.body?.mutations) ? req.body.mutations : null;
  if (!mutations) {
    return res
      .status(422)
      .json({ erreur: 'validation', champs: { mutations: 'tableau attendu' } });
  }
  if (mutations.length > 200) {
    return res
      .status(413)
      .json({ erreur: 'lot_trop_grand', message: '200 mutations maximum par lot.' });
  }

  const db = charger();
  const resultats = [];

  for (const mutation of mutations) {
    const idMutation = mutation?.id;

    if (!idMutation || typeof idMutation !== 'string') {
      resultats.push({ id: idMutation ?? null, statut: 'erreur', message: 'id de mutation absent' });
      continue;
    }

    // Rejeu : on renvoie le resultat memorise sans reappliquer.
    if (db.mutationsTraitees[idMutation]) {
      const memo = db.mutationsTraitees[idMutation];
      resultats.push({
        id: idMutation,
        statut: memo.statut,
        rejeu: true,
        livre: memo.idLivre ? db.livres.find((l) => l.id === memo.idLivre) ?? null : null,
      });
      continue;
    }

    const memoriser = (resultat, idLivre = null) => {
      db.mutationsTraitees[idMutation] = {
        statut: resultat.statut,
        idLivre,
        traiteLe: maintenant(),
      };
      resultats.push({ id: idMutation, ...resultat });
    };

    if (mutation.type === 'create') {
      const { valeur, erreurs } = validerLivre(mutation.livre ?? {});
      if (erreurs) {
        memoriser({ statut: 'erreur', champs: erreurs });
        continue;
      }
      const livre = creerLivre(valeur);
      db.livres.push(livre);
      memoriser({ statut: 'ok', livre }, livre.id);
      continue;
    }

    if (mutation.type === 'update') {
      const index = db.livres.findIndex((l) => l.id === mutation.livre?.id);
      if (index === -1) {
        memoriser({ statut: 'erreur', message: 'livre introuvable' });
        continue;
      }
      const actuel = db.livres[index];

      if (mutation.baseVersion !== undefined && Number(mutation.baseVersion) !== actuel.version) {
        memoriser({ statut: 'conflit', serveur: actuel, versionAttendue: actuel.version });
        continue;
      }

      const { valeur, erreurs } = validerLivre(mutation.livre ?? {}, true);
      if (erreurs) {
        memoriser({ statut: 'erreur', champs: erreurs });
        continue;
      }
      const livre = appliquerMaj(actuel, valeur);
      db.livres[index] = livre;
      memoriser({ statut: 'ok', livre }, livre.id);
      continue;
    }

    if (mutation.type === 'delete') {
      const id = mutation.livre?.id ?? mutation.livreId;
      const index = db.livres.findIndex((l) => l.id === id);
      if (index === -1) {
        // Suppression d'un livre deja absent : succes idempotent.
        memoriser({ statut: 'ok', supprime: true });
        continue;
      }
      const actuel = db.livres[index];
      if (mutation.baseVersion !== undefined && Number(mutation.baseVersion) !== actuel.version) {
        memoriser({ statut: 'conflit', serveur: actuel, versionAttendue: actuel.version });
        continue;
      }
      db.livres.splice(index, 1);
      db.notes = db.notes.filter((n) => n.livreId !== id);
      memoriser({ statut: 'ok', supprime: true });
      continue;
    }

    resultats.push({ id: idMutation, statut: 'erreur', message: `type inconnu : ${mutation.type}` });
  }

  sauvegarder();

  const conflits = resultats.filter((r) => r.statut === 'conflit').length;
  res.json({
    resultats,
    resume: {
      total: resultats.length,
      ok: resultats.filter((r) => r.statut === 'ok').length,
      conflits,
      erreurs: resultats.filter((r) => r.statut === 'erreur').length,
    },
    serveurLe: maintenant(),
  });
});

module.exports = routeur;
