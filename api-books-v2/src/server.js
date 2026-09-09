const express = require('express');
const cors = require('cors');

const { charger } = require('./db');
const { chaos, gestionErreurs, AUTH_REQUISE } = require('./middleware');
const routesLivres = require('./routes-livres');
const routesSysteme = require('./routes-systeme');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(
  cors({
    origin: true,
    exposedHeaders: ['ETag'],
    allowedHeaders: ['Content-Type', 'Authorization', 'If-Match'],
  }),
);
app.use(express.json({ limit: '2mb' }));

// Journal minimal : indispensable pour deboguer le mode chaos.
app.use((req, res, next) => {
  const debut = Date.now();
  res.on('finish', () => {
    const duree = Date.now() - debut;
    const marque = res.statusCode >= 500 ? '!!' : res.statusCode >= 400 ? ' *' : '  ';
    console.log(`${marque} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duree} ms)`);
  });
  next();
});

app.get('/health', (req, res) => {
  const db = charger();
  res.json({
    statut: 'ok',
    version: '2.0.0',
    authRequise: AUTH_REQUISE,
    chaos: {
      latence: Number(process.env.CHAOS_LATENCE || 0),
      tauxEchec: Number(process.env.CHAOS_ECHEC || 0),
    },
    livres: db.livres.length,
    notes: db.notes.length,
  });
});

app.use(chaos);
app.use(routesLivres);
app.use(routesSysteme);

app.use((req, res) => {
  res.status(404).json({ erreur: 'route_inconnue', message: `${req.method} ${req.path}` });
});

app.use(gestionErreurs);

if (require.main === module) {
  const db = charger();
  if (db.livres.length === 0) {
    console.log('\n  Base vide. Lancez `npm run seed` pour generer 500 livres.\n');
  }

  app.listen(PORT, () => {
    console.log(`
  API BookList Pro v2
  ------------------------------------------
  URL              http://localhost:${PORT}
  Livres en base   ${db.livres.length}
  Auth requise     ${AUTH_REQUISE ? 'OUI' : 'non (paliers 10-16)'}
  Chaos            latence ${process.env.CHAOS_LATENCE || 0} ms / echec ${
      Number(process.env.CHAOS_ECHEC || 0) * 100
    } %
  ------------------------------------------
`);
  });
}

module.exports = app;
