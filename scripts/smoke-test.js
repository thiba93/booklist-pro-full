/**
 * Test de fumee : verifie toutes les routes de l'API.
 *   npm run test:api            (auth desactivee)
 *   AUTH_REQUIRED=true npm run test:api
 *
 * Demarre son propre serveur sur un port libre : ne lancez pas npm start avant.
 */
const app = require('../src/server');

let echecs = 0;
let base = '';
let jeton = null;

function verifier(intitule, condition, detail = '') {
  if (condition) {
    console.log(`  ok   ${intitule}`);
  } else {
    echecs += 1;
    console.log(`  ECHEC ${intitule} ${detail}`);
  }
}

async function appel(chemin, options = {}) {
  const entetes = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (jeton) entetes.Authorization = `Bearer ${jeton}`;
  const reponse = await fetch(base + chemin, { ...options, headers: entetes });
  const texte = await reponse.text();
  let corps = null;
  try {
    corps = texte ? JSON.parse(texte) : null;
  } catch {
    corps = texte;
  }
  return { statut: reponse.status, corps, entetes: reponse.headers };
}

async function main() {
  const serveur = app.listen(0);
  base = `http://127.0.0.1:${serveur.address().port}`;

  const sante = await appel('/health');
  verifier('GET /health', sante.statut === 200 && sante.corps.statut === 'ok');

  if (sante.corps.authRequise) {
    console.log('\n-- Authentification --');
    const mauvais = await appel('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'editeur@booklist.fr', motDePasse: 'faux' }),
    });
    verifier('login refuse un mauvais mot de passe', mauvais.statut === 401);

    const sansJeton = await appel('/books');
    verifier('GET /books sans jeton -> 401', sansJeton.statut === 401);

    const connexion = await appel('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'editeur@booklist.fr', motDePasse: 'editeur123' }),
    });
    verifier('login editeur', connexion.statut === 200 && !!connexion.corps.accessToken);

    const rafraichi = await appel('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: connexion.corps.refreshToken }),
    });
    verifier('refresh renvoie un nouveau jeton', rafraichi.statut === 200 && !!rafraichi.corps.accessToken);

    jeton = connexion.corps.accessToken;

    const moi = await appel('/me');
    verifier('GET /me', moi.statut === 200 && moi.corps.role === 'editeur');

    // Role lecteur : lecture autorisee, ecriture interdite.
    const cnxLecteur = await appel('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'lecteur@booklist.fr', motDePasse: 'lecteur123' }),
    });
    const jetonEditeur = jeton;
    jeton = cnxLecteur.corps.accessToken;
    const lectureLecteur = await appel('/books?limit=1');
    const ecritureLecteur = await appel('/books', {
      method: 'POST',
      body: JSON.stringify({ titre: 'X', auteur: 'Y', annee: 2020 }),
    });
    verifier('lecteur peut lire', lectureLecteur.statut === 200);
    verifier('lecteur ne peut pas ecrire -> 403', ecritureLecteur.statut === 403);
    jeton = jetonEditeur;
  }

  console.log('\n-- Livres --');
  const liste = await appel('/books?page=1&limit=5');
  verifier('GET /books pagine', liste.statut === 200 && liste.corps.items.length === 5);
  verifier('total present', typeof liste.corps.total === 'number' && liste.corps.total > 0);
  verifier('totalPages coherent', liste.corps.totalPages === Math.ceil(liste.corps.total / 5));

  const triAsc = await appel('/books?limit=50&sort=annee&order=asc');
  const annees = triAsc.corps.items.map((l) => l.annee);
  verifier('tri par annee croissant', annees.every((a, i) => i === 0 || annees[i - 1] <= a));

  const filtreLus = await appel('/books?limit=50&status=lu');
  verifier('filtre status=lu', filtreLus.corps.items.every((l) => l.lu === true));

  const filtreFav = await appel('/books?limit=50&favori=true');
  verifier('filtre favori=true', filtreFav.corps.items.every((l) => l.favori === true));

  const premierAuteur = liste.corps.items[0].auteur.split(' ')[1];
  const recherche = await appel(`/books?limit=50&q=${encodeURIComponent(premierAuteur)}`);
  verifier(
    'recherche q sur auteur',
    recherche.corps.items.length > 0 &&
      recherche.corps.items.every(
        (l) =>
          l.auteur.toLowerCase().includes(premierAuteur.toLowerCase()) ||
          l.titre.toLowerCase().includes(premierAuteur.toLowerCase()),
      ),
  );

  const limiteHaute = await appel('/books?limit=9999');
  verifier('limit plafonnee a 100', limiteHaute.corps.items.length <= 100);

  const invalide = await appel('/books', {
    method: 'POST',
    body: JSON.stringify({ titre: '', auteur: 'A', annee: 1200 }),
  });
  verifier('POST invalide -> 422', invalide.statut === 422 && !!invalide.corps.champs);

  const creation = await appel('/books', {
    method: 'POST',
    body: JSON.stringify({
      titre: 'Livre de test',
      auteur: 'Testeur Automatique',
      editeur: 'Ascent',
      annee: 2026,
    }),
  });
  verifier('POST /books -> 201', creation.statut === 201 && creation.corps.version === 1);
  const id = creation.corps.id;

  const detail = await appel(`/books/${id}`);
  verifier('GET /books/:id', detail.statut === 200 && detail.corps.id === id);
  verifier('ETag expose', detail.entetes.get('etag') === '1');

  const maj = await appel(`/books/${id}`, {
    method: 'PUT',
    headers: { 'If-Match': '1' },
    body: JSON.stringify({
      titre: 'Livre de test',
      auteur: 'Testeur Automatique',
      editeur: 'Ascent',
      annee: 2026,
      lu: true,
      note: 4,
    }),
  });
  verifier('PUT avec If-Match valide', maj.statut === 200 && maj.corps.version === 2);
  verifier('PUT exige une representation complete', 
    (await appel(`/books/${id}`, { method: 'PUT', body: JSON.stringify({ lu: false }) })).statut === 422);

  const conflit = await appel(`/books/${id}`, {
    method: 'PUT',
    headers: { 'If-Match': '1' },
    body: JSON.stringify({
      titre: 'Livre de test',
      auteur: 'Testeur Automatique',
      annee: 2026,
      lu: false,
    }),
  });
  verifier(
    'PUT avec version perimee -> 409',
    conflit.statut === 409 && conflit.corps.serveur.version === 2,
  );

  const sansIfMatch = await appel(`/books/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ favori: true }),
  });
  verifier('PATCH sans If-Match accepte', sansIfMatch.statut === 200 && sansIfMatch.corps.favori === true);

  console.log('\n-- Notes --');
  const noteVide = await appel(`/books/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ contenu: '   ' }),
  });
  verifier('POST note vide -> 422', noteVide.statut === 422);

  const note = await appel(`/books/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ contenu: 'Une note de test.' }),
  });
  verifier('POST note -> 201', note.statut === 201);

  const notes = await appel(`/books/${id}/notes`);
  verifier('GET notes', notes.statut === 200 && notes.corps.length === 1);

  const suppNote = await appel(`/books/${id}/notes/${note.corps.id}`, { method: 'DELETE' });
  verifier('DELETE note -> 204', suppNote.statut === 204);

  console.log('\n-- Stats --');
  const stats = await appel('/stats');
  verifier('GET /stats', stats.statut === 200 && stats.corps.total > 0);
  verifier('lus + nonLus = total', stats.corps.lus + stats.corps.nonLus === stats.corps.total);
  verifier('distributionNotes presente', stats.corps.distributionNotes.length === 6);
  verifier('parAnnee triee', stats.corps.parAnnee.every((e, i, t) => i === 0 || t[i - 1].annee <= e.annee));

  console.log('\n-- Sync --');
  const idMutation1 = `mut-${Date.now()}-1`;
  const idMutation2 = `mut-${Date.now()}-2`;

  const versionActuelle = (await appel(`/books/${id}`)).corps.version;

  const sync = await appel('/sync', {
    method: 'POST',
    body: JSON.stringify({
      mutations: [
        {
          id: idMutation1,
          type: 'create',
          livre: { titre: 'Cree hors ligne', auteur: 'Sync', annee: 2026 },
        },
        {
          id: idMutation2,
          type: 'update',
          baseVersion: versionActuelle,
          livre: { id, note: 5 },
        },
        {
          id: `mut-${Date.now()}-3`,
          type: 'update',
          baseVersion: 1,
          livre: { id, note: 1 },
        },
      ],
    }),
  });
  verifier('POST /sync -> 200', sync.statut === 200);
  verifier('creation hors ligne appliquee', sync.corps.resultats[0].statut === 'ok');
  verifier('mise a jour appliquee', sync.corps.resultats[1].statut === 'ok');
  verifier('version perimee -> conflit', sync.corps.resultats[2].statut === 'conflit');
  verifier('resume coherent', sync.corps.resume.ok === 2 && sync.corps.resume.conflits === 1);

  const idCree = sync.corps.resultats[0].livre.id;

  const rejeu = await appel('/sync', {
    method: 'POST',
    body: JSON.stringify({
      mutations: [
        {
          id: idMutation1,
          type: 'create',
          livre: { titre: 'Cree hors ligne', auteur: 'Sync', annee: 2026 },
        },
      ],
    }),
  });
  verifier('rejeu signale', rejeu.corps.resultats[0].rejeu === true);

  const doublons = await appel('/books?limit=100&q=Cree hors ligne');
  verifier(
    'idempotence : un seul exemplaire cree',
    doublons.corps.items.filter((l) => l.titre === 'Cree hors ligne').length === 1,
  );

  const suppSync = await appel('/sync', {
    method: 'POST',
    body: JSON.stringify({
      mutations: [{ id: `mut-${Date.now()}-4`, type: 'delete', livreId: idCree }],
    }),
  });
  verifier('suppression via sync', suppSync.corps.resultats[0].statut === 'ok');

  const suppFantome = await appel('/sync', {
    method: 'POST',
    body: JSON.stringify({
      mutations: [{ id: `mut-${Date.now()}-5`, type: 'delete', livreId: 'inexistant' }],
    }),
  });
  verifier('suppression idempotente d un livre absent', suppFantome.corps.resultats[0].statut === 'ok');

  console.log('\n-- Divers --');
  const supp = await appel(`/books/${id}`, { method: 'DELETE' });
  verifier('DELETE /books/:id -> 204', supp.statut === 204);

  const apresSupp = await appel(`/books/${id}`);
  verifier('livre supprime -> 404', apresSupp.statut === 404);

  const inconnue = await appel('/nimporte-quoi');
  verifier('route inconnue -> 404', inconnue.statut === 404);

  serveur.close();

  console.log(`\n${echecs === 0 ? 'TOUS LES TESTS PASSENT' : `${echecs} ECHEC(S)`}\n`);
  process.exit(echecs === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
