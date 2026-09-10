const TAILLE_MAX_OCTETS = 2 * 1024 * 1024; // 2 Mo decode, marge sous la limite JSON du serveur
const MIME_AUTORISES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const PALETTE = ['#0F766E', '#B45309', '#7C3AED', '#BE123C', '#0369A1', '#4D7C0F'];

/**
 * Couleur stable derivee de l'id : deux appels pour le meme livre
 * renvoient toujours la meme couleur (utile pour un avatar coherent).
 */
function couleurPourId(id) {
  const somme = [...String(id)].reduce((acc, car) => acc + car.charCodeAt(0), 0);
  return PALETTE[somme % PALETTE.length];
}

function initiales(livre) {
  const lettre = (texte) => (texte || '').trim().charAt(0).toUpperCase();
  const valeur = `${lettre(livre.titre)}${lettre(livre.auteur)}`;
  return valeur.length > 0 ? valeur : '?';
}

function echapperXml(texte) {
  return String(texte).replace(/[&<>"']/g, (car) => {
    const table = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
    return table[car];
  });
}

/**
 * Genere une couverture de substitution deterministe (memes initiales,
 * meme couleur a chaque appel) pour un livre sans image televersee.
 */
function genererSvgPlaceholder(livre) {
  const couleur = couleurPourId(livre.id);
  const texte = echapperXml(initiales(livre));

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320" viewBox="0 0 240 320">',
    `<rect width="240" height="320" fill="${couleur}" />`,
    '<rect x="12" y="12" width="216" height="296" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2" />',
    `<text x="120" y="172" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${texte}</text>`,
    '</svg>',
  ].join('');
}

/**
 * Decode une image envoyee par le client (data URL ou base64 brut).
 * Retourne { base64, mime, octets } ou { erreur }.
 */
function decoderImageBase64(valeur) {
  if (typeof valeur !== 'string' || valeur.trim().length === 0) {
    return { erreur: 'image manquante' };
  }

  const correspondance = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/s.exec(valeur.trim());
  const mime = correspondance ? correspondance[1] : 'image/png';
  const base64 = correspondance ? correspondance[2] : valeur.trim();

  if (!MIME_AUTORISES.has(mime)) {
    return { erreur: `type d'image non supporte : ${mime}` };
  }

  let tampon;
  try {
    tampon = Buffer.from(base64, 'base64');
  } catch {
    return { erreur: 'contenu base64 invalide' };
  }

  if (tampon.length === 0) {
    return { erreur: 'image vide' };
  }

  if (tampon.length > TAILLE_MAX_OCTETS) {
    return { erreur: `image trop volumineuse (max ${TAILLE_MAX_OCTETS / (1024 * 1024)} Mo)` };
  }

  return { base64, mime, octets: tampon.length };
}

module.exports = { genererSvgPlaceholder, decoderImageBase64 };
