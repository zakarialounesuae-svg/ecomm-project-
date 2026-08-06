require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { validateCandidature } = require('./validate');
const { appendCandidature, findExistingByPhoneOrEmail, isConfigured } = require('./sheets');

const app = express();
const PORT = process.env.PORT || 3000;
const WIDGET_ORIGIN = process.env.MISDAKIA_WIDGET_ORIGIN || 'https://misdakia-staging.t4startups.com';

app.disable('x-powered-by');
app.set('trust proxy', 1);

// CSP: seul le domaine Misdakia nécessaire au script/aux requêtes du widget est autorisé (NFR "CSP").
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", WIDGET_ORIGIN],
        connectSrc: ["'self'", WIDGET_ORIGIN],
        imgSrc: ["'self'", 'data:', WIDGET_ORIGIN],
        styleSrc: ["'self'", "'unsafe-inline'"],
        frameSrc: [WIDGET_ORIGIN],
        objectSrc: ["'none'"],
      },
    },
  })
);

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Anti-spam (FR-10) : limite le nombre de soumissions par IP.
const candidatureLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'server', message: 'Trop de tentatives. Merci de réessayer plus tard.' },
});

app.post('/api/candidature', candidatureLimiter, async (req, res) => {
  const { valid, errors } = validateCandidature(req.body);

  if (!valid) {
    return res.status(400).json({ success: false, error: 'validation', errors });
  }

  if (!isConfigured()) {
    console.error('[api/candidature] Google Sheets non configuré (variables d’environnement manquantes).');
    return res.status(503).json({
      success: false,
      error: 'server',
      message: 'Le service est temporairement indisponible. Merci de réessayer dans quelques instants.',
    });
  }

  const body = req.body;
  const now = new Date();

  try {
    const isDuplicate = await findExistingByPhoneOrEmail(body.telephone.trim(), body.email.trim());

    const row = {
      id_candidature: crypto.randomUUID(),
      date_soumission: now.toISOString(),
      prenom: body.prenom.trim(),
      nom: body.nom.trim(),
      telephone: body.telephone.trim(),
      email: body.email.trim().toLowerCase(),
      pays: body.pays.trim(),
      nombre_produits: Number(body.nombre_produits),
      nombre_boutiques: Number(body.nombre_boutiques),
      ventes_par_jour: Number(body.ventes_par_jour),
      ventes_par_mois: Number(body.ventes_par_mois),
      ca_mensuel: Number(body.ca_mensuel),
      devise: body.devise,
      url_boutique: body.url_boutique ? String(body.url_boutique).trim() : '',
      plateforme: body.plateforme ? String(body.plateforme).trim() : '',
      source: body.source ? String(body.source).trim() : '',
      consentement: `Oui - ${now.toISOString()}`,
      statut: 'Nouveau',
      notes: isDuplicate ? 'Doublon probable (téléphone ou e-mail déjà présent).' : '',
    };

    // FR-04/FR-08 : une candidature valide crée toujours exactement une ligne,
    // même en cas de doublon probable — l'équipe qualifie ensuite manuellement.
    await appendCandidature(row);

    return res.json({ success: true, duplicate: isDuplicate });
  } catch (err) {
    // Traçabilité : on journalise l'erreur sans les données personnelles du candidat.
    console.error('[api/candidature] échec d’enregistrement:', err.message);
    return res.status(502).json({
      success: false,
      error: 'server',
      message: 'Une erreur est survenue. Veuillez réessayer dans quelques instants.',
    });
  }
});

app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Misdakia landing page en écoute sur le port ${PORT}`);
});
