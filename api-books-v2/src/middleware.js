const jwt = require('jsonwebtoken');
const { charger } = require('./db');

const SECRET_ACCES = process.env.JWT_SECRET || 'secret-de-formation-ne-pas-utiliser-en-prod';
const SECRET_REFRESH = process.env.JWT_REFRESH_SECRET || `${SECRET_ACCES}-refresh`;
const TTL_ACCES = process.env.ACCESS_TOKEN_TTL || '120s';
const TTL_REFRESH = process.env.REFRESH_TOKEN_TTL || '7d';

const AUTH_REQUISE = process.env.AUTH_REQUIRED === 'true';

function signerAcces(utilisateur) {
  return jwt.sign({ sub: utilisateur.id, role: utilisateur.role }, SECRET_ACCES, {
    expiresIn: TTL_ACCES,
  });
}

function signerRefresh(utilisateur) {
  return jwt.sign({ sub: utilisateur.id, type: 'refresh' }, SECRET_REFRESH, {
    expiresIn: TTL_REFRESH,
  });
}

function verifierRefresh(token) {
  return jwt.verify(token, SECRET_REFRESH);
}

/**
 * Chaos : latence artificielle et echecs aleatoires.
 *   CHAOS_LATENCE=1500  CHAOS_ECHEC=0.3  npm start
 * Les routes d'authentification sont epargnees par defaut pour que le
 * mode degrade reste debogable (CHAOS_AUTH=true pour les inclure).
 */
function chaos(req, res, next) {
  const latence = Number(process.env.CHAOS_LATENCE || 0);
  const tauxEchec = Number(process.env.CHAOS_ECHEC || 0);
  if (latence === 0 && tauxEchec === 0) return next();

  const epargne = req.path.startsWith('/auth') && process.env.CHAOS_AUTH !== 'true';
  if (epargne) return next();

  const jitter = latence > 0 ? Math.random() * latence * 0.4 : 0;

  setTimeout(() => {
    if (Math.random() < tauxEchec) {
      return res.status(503).json({
        erreur: 'service_indisponible',
        message: 'Le service est temporairement indisponible. Reessayez.',
      });
    }
    next();
  }, latence + jitter);
}

/**
 * Authentification. Inactive tant que AUTH_REQUIRED n'est pas 'true' :
 * les paliers 10 a 16 travaillent sans jeton, le palier 18 l'active.
 */
function authentifier(rolesAutorises = ['lecteur', 'editeur']) {
  return (req, res, next) => {
    if (!AUTH_REQUISE) {
      req.utilisateur = { id: 'anonyme', role: 'editeur', email: 'anonyme@local' };
      return next();
    }

    const entete = req.headers.authorization || '';
    const [schema, token] = entete.split(' ');

    if (schema !== 'Bearer' || !token) {
      return res.status(401).json({ erreur: 'jeton_absent', message: 'Jeton manquant.' });
    }

    let charge;
    try {
      charge = jwt.verify(token, SECRET_ACCES);
    } catch (e) {
      const expire = e.name === 'TokenExpiredError';
      return res.status(401).json({
        erreur: expire ? 'jeton_expire' : 'jeton_invalide',
        message: expire ? 'Jeton expire.' : 'Jeton invalide.',
      });
    }

    const utilisateur = charger().utilisateurs.find((u) => u.id === charge.sub);
    if (!utilisateur) {
      return res.status(401).json({ erreur: 'jeton_invalide', message: 'Utilisateur inconnu.' });
    }

    if (!rolesAutorises.includes(utilisateur.role)) {
      return res.status(403).json({
        erreur: 'droits_insuffisants',
        message: `Role ${utilisateur.role} : action non autorisee.`,
      });
    }

    req.utilisateur = { id: utilisateur.id, role: utilisateur.role, email: utilisateur.email };
    next();
  };
}

const ecrivain = () => authentifier(['editeur']);

function gestionErreurs(err, req, res, _next) {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ erreur: 'json_invalide', message: 'Corps JSON illisible.' });
  }
  console.error('[erreur]', err);
  res.status(500).json({ erreur: 'erreur_serveur', message: 'Erreur interne.' });
}

module.exports = {
  chaos,
  authentifier,
  ecrivain,
  gestionErreurs,
  signerAcces,
  signerRefresh,
  verifierRefresh,
  AUTH_REQUISE,
  TTL_ACCES,
};
