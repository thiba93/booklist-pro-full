/**
 * Genere un jeu de donnees deterministe.
 *   node src/seed.js         -> 500 livres
 *   node src/seed.js 50      -> 50 livres
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { remplacer, FICHIER } = require('./db');

const NOMBRE = Number(process.argv[2] || process.env.SEED_COUNT || 500);

// Generateur pseudo-aleatoire deterministe : le meme seed produit le meme jeu.
let graine = 20261112;
function alea() {
  graine = (graine * 1103515245 + 12345) % 2147483648;
  return graine / 2147483648;
}
const choisir = (tab) => tab[Math.floor(alea() * tab.length)];
const entier = (min, max) => min + Math.floor(alea() * (max - min + 1));

const PRENOMS = ['Ursula', 'Isaac', 'Octavia', 'Frank', 'Ted', 'Ann', 'Kim', 'Liu', 'Nnedi', 'Arkady', 'Becky', 'Martha', 'Alain', 'Pierre', 'Nathalie', 'Serge', 'Elisabeth', 'Laurent'];
const NOMS = ['Le Guin', 'Asimov', 'Butler', 'Herbert', 'Chiang', 'Leckie', 'Robinson', 'Cixin', 'Okorafor', 'Martine', 'Chambers', 'Wells', 'Damasio', 'Bordage', 'Henneberg', 'Brussolo', 'Vonarburg', 'Genefort'];
const MOTS_A = ['La', 'Le', 'Les', 'Un', 'Une', 'Des'];
const MOTS_B = ['Cite', 'Horizon', 'Memoire', 'Silence', 'Fracture', 'Orbite', 'Frontiere', 'Machine', 'Jardin', 'Vertige', 'Archipel', 'Sillage', 'Prisme', 'Derive', 'Colonie', 'Echo'];
const MOTS_C = ['des cendres', 'du vide', 'sans fin', 'oublie', 'de verre', 'des origines', 'perdue', 'fragmentee', 'de Mars', 'du dernier jour', 'des profondeurs', 'inverse'];
const EDITEURS = ['Denoel', 'Le Belial', 'Actes Sud', 'Gallimard', 'Bragelonne', 'Mnemos', 'Folio SF', 'La Volte', 'Albin Michel', 'Robert Laffont'];

function genererLivre(index) {
  const date = new Date(Date.now() - entier(0, 900) * 86400000).toISOString();
  const lu = alea() < 0.45;
  const noteAttribuee = lu && alea() < 0.8;

  return {
    id: crypto.randomUUID(),
    titre: `${choisir(MOTS_A)} ${choisir(MOTS_B)} ${choisir(MOTS_C)}`.replace(/\s+/g, ' '),
    auteur: `${choisir(PRENOMS)} ${choisir(NOMS)}`,
    editeur: choisir(EDITEURS),
    annee: entier(1954, 2026),
    lu,
    favori: alea() < 0.18,
    note: noteAttribuee ? entier(1, 5) : null,
    couverture: null,
    createdAt: date,
    updatedAt: date,
    version: 1,
  };
}

const CONTENUS_NOTES = [
  'Premier tiers difficile, puis impossible a lacher.',
  'La construction du monde est remarquable, les personnages moins.',
  'A relire dans quelques annees.',
  'Le chapitre 12 justifie a lui seul la lecture.',
  'Traduction inegale, preferer la version originale.',
  'Recommande par la librairie du coin, bon conseil.',
  'Fin trop rapide au regard de la mise en place.',
];

function main() {
  const livres = Array.from({ length: NOMBRE }, (_, i) => genererLivre(i));

  const notes = [];
  for (const livre of livres) {
    if (alea() < 0.35) {
      const combien = entier(1, 3);
      for (let i = 0; i < combien; i += 1) {
        notes.push({
          id: crypto.randomUUID(),
          livreId: livre.id,
          contenu: choisir(CONTENUS_NOTES),
          createdAt: new Date(Date.now() - entier(0, 200) * 86400000).toISOString(),
        });
      }
    }
  }

  const utilisateurs = [
    {
      id: crypto.randomUUID(),
      email: 'editeur@booklist.fr',
      hash: bcrypt.hashSync('editeur123', 8),
      role: 'editeur',
    },
    {
      id: crypto.randomUUID(),
      email: 'lecteur@booklist.fr',
      hash: bcrypt.hashSync('lecteur123', 8),
      role: 'lecteur',
    },
  ];

  remplacer({ livres, notes, utilisateurs, mutationsTraitees: {} });

  console.log(`
  Base generee : ${FICHIER}
  ------------------------------------------
  Livres        ${livres.length}
  Notes         ${notes.length}
  Comptes       editeur@booklist.fr / editeur123   (role editeur)
                lecteur@booklist.fr / lecteur123   (role lecteur, lecture seule)
`);
}

main();
