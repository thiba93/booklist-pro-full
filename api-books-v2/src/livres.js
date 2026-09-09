const crypto = require('crypto');

const CHAMPS_TRI = ['titre', 'auteur', 'annee', 'note', 'updatedAt'];

function maintenant() {
  return new Date().toISOString();
}

/**
 * Normalise et valide une entree client.
 * Retourne { valeur } ou { erreurs: { champ: message } }.
 */
function validerLivre(entree, partiel = false) {
  const erreurs = {};
  const v = {};

  const texte = (cle, obligatoire, max = 200) => {
    const brut = entree[cle];
    if (brut === undefined) {
      if (obligatoire && !partiel) erreurs[cle] = 'champ obligatoire';
      return;
    }
    if (typeof brut !== 'string') {
      erreurs[cle] = 'doit etre une chaine';
      return;
    }
    const propre = brut.trim();
    if (obligatoire && propre.length === 0) {
      erreurs[cle] = 'ne peut pas etre vide';
      return;
    }
    if (propre.length > max) {
      erreurs[cle] = `${max} caracteres maximum`;
      return;
    }
    v[cle] = propre;
  };

  texte('titre', true);
  texte('auteur', true);
  texte('editeur', false);
  texte('couverture', false, 500);

  if (entree.annee !== undefined) {
    const n = Number(entree.annee);
    if (!Number.isInteger(n) || n < 1450 || n > new Date().getFullYear() + 1) {
      erreurs.annee = 'annee invalide (1450 - annee prochaine)';
    } else {
      v.annee = n;
    }
  } else if (!partiel) {
    erreurs.annee = 'champ obligatoire';
  }

  if (entree.note !== undefined && entree.note !== null) {
    const n = Number(entree.note);
    if (!Number.isFinite(n) || n < 0 || n > 5) erreurs.note = 'note entre 0 et 5';
    else v.note = n;
  }

  for (const cle of ['lu', 'favori']) {
    if (entree[cle] !== undefined) {
      if (typeof entree[cle] !== 'boolean') erreurs[cle] = 'doit etre un booleen';
      else v[cle] = entree[cle];
    }
  }

  if (Object.keys(erreurs).length > 0) return { erreurs };
  return { valeur: v };
}

function creerLivre(valeur) {
  const date = maintenant();
  return {
    id: crypto.randomUUID(),
    titre: valeur.titre,
    auteur: valeur.auteur,
    editeur: valeur.editeur ?? '',
    annee: valeur.annee,
    lu: valeur.lu ?? false,
    favori: valeur.favori ?? false,
    note: valeur.note ?? null,
    couverture: valeur.couverture ?? null,
    createdAt: date,
    updatedAt: date,
    version: 1,
  };
}

function appliquerMaj(livre, valeur) {
  return {
    ...livre,
    ...valeur,
    id: livre.id,
    createdAt: livre.createdAt,
    updatedAt: maintenant(),
    version: livre.version + 1,
  };
}

function sansAccent(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Filtre, trie et pagine. Pure : testable sans serveur.
 */
function interroger(livres, params) {
  const page = Math.max(1, Number.parseInt(params.page, 10) || 1);
  const limitBrute = Number.parseInt(params.limit, 10) || 20;
  const limit = Math.min(100, Math.max(1, limitBrute));

  let resultat = livres;

  if (params.q) {
    const q = sansAccent(params.q);
    resultat = resultat.filter(
      (l) => sansAccent(l.titre).includes(q) || sansAccent(l.auteur).includes(q),
    );
  }

  if (params.status === 'lu') resultat = resultat.filter((l) => l.lu === true);
  if (params.status === 'nonlu') resultat = resultat.filter((l) => l.lu === false);

  if (params.favori === 'true') resultat = resultat.filter((l) => l.favori === true);
  if (params.favori === 'false') resultat = resultat.filter((l) => l.favori === false);

  if (params.auteur) {
    const a = sansAccent(params.auteur);
    resultat = resultat.filter((l) => sansAccent(l.auteur) === a);
  }

  const champ = CHAMPS_TRI.includes(params.sort) ? params.sort : 'titre';
  const sens = params.order === 'desc' ? -1 : 1;

  resultat = [...resultat].sort((a, b) => {
    const va = a[champ];
    const vb = b[champ];
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sens;
    return String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base' }) * sens;
  });

  const total = resultat.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const debut = (page - 1) * limit;

  return {
    items: resultat.slice(debut, debut + limit),
    page,
    limit,
    total,
    totalPages,
  };
}

module.exports = { validerLivre, creerLivre, appliquerMaj, interroger, maintenant, CHAMPS_TRI };
