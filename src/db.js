const fs = require('fs');
const path = require('path');

const FICHIER = path.join(__dirname, '..', 'data', 'db.json');

const VIDE = {
  livres: [],
  notes: [],
  utilisateurs: [],
  mutationsTraitees: {}, // idMutation -> { statut, idLivre, traiteLe }
  media: {}, // idLivre -> { base64, mime, majLe }
};

let cache = null;
let ecritureEnCours = null;

function charger() {
  if (cache) return cache;
  try {
    const brut = fs.readFileSync(FICHIER, 'utf8');
    cache = { ...VIDE, ...JSON.parse(brut) };
  } catch {
    cache = structuredClone(VIDE);
  }
  return cache;
}

/**
 * Ecriture serialisee : evite qu'une rafale de requetes concurrentes
 * ne corrompe le fichier. Ecriture atomique via fichier temporaire.
 */
function sauvegarder() {
  const donnees = charger();
  ecritureEnCours = Promise.resolve(ecritureEnCours).then(() => {
    fs.mkdirSync(path.dirname(FICHIER), { recursive: true });
    const tmp = `${FICHIER}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(donnees, null, 2), 'utf8');
    fs.renameSync(tmp, FICHIER);
  });
  return ecritureEnCours;
}

function remplacer(donnees) {
  cache = { ...structuredClone(VIDE), ...donnees };
  sauvegarder();
  return cache;
}

module.exports = { charger, sauvegarder, remplacer, FICHIER };
