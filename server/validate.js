const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s().-]{6,20}$/;
const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/i;
const CURRENCIES = ['DZD', 'EUR', 'USD', 'Autre'];

function isNonEmptyString(value, min, max) {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}

function isInteger(value, min) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min;
}

function isAmount(value, min) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min;
}

/**
 * Validates the qualification form payload server-side (FR-03: la validation
 * ne doit jamais reposer uniquement sur le navigateur).
 * Returns { valid: boolean, errors: { field: message } }
 */
function validateCandidature(body = {}) {
  const errors = {};

  if (!isNonEmptyString(body.prenom, 2, 50)) {
    errors.prenom = 'Le prénom doit contenir entre 2 et 50 caractères.';
  }
  if (!isNonEmptyString(body.nom, 2, 50)) {
    errors.nom = 'Le nom doit contenir entre 2 et 50 caractères.';
  }
  if (typeof body.telephone !== 'string' || !PHONE_RE.test(body.telephone.trim())) {
    errors.telephone = 'Merci de saisir un numéro valide avec indicatif pays.';
  }
  if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email.trim())) {
    errors.email = 'Merci de saisir une adresse e-mail valide.';
  }
  if (!isNonEmptyString(body.pays, 2, 100)) {
    errors.pays = 'Merci d’indiquer votre pays d’activité.';
  }
  if (!isInteger(body.nombre_produits, 1)) {
    errors.nombre_produits = 'Indiquez un nombre de produits d’au moins 1.';
  }
  if (!isInteger(body.nombre_boutiques, 1)) {
    errors.nombre_boutiques = 'Indiquez un nombre de boutiques d’au moins 1.';
  }
  if (!isInteger(body.ventes_par_jour, 0)) {
    errors.ventes_par_jour = 'Indiquez un nombre de commandes par jour (0 ou plus).';
  }
  if (!isInteger(body.ventes_par_mois, 0)) {
    errors.ventes_par_mois = 'Indiquez un nombre de commandes par mois (0 ou plus).';
  }
  if (!isAmount(body.ca_mensuel, 0)) {
    errors.ca_mensuel = 'Indiquez un chiffre d’affaires mensuel valide (0 ou plus).';
  }
  if (typeof body.devise !== 'string' || !CURRENCIES.includes(body.devise)) {
    errors.devise = 'Merci de choisir une devise.';
  }
  if (body.url_boutique && !URL_RE.test(String(body.url_boutique).trim())) {
    errors.url_boutique = 'Merci de saisir une URL valide (https://...).';
  }
  if (body.consentement !== true) {
    errors.consentement = 'Le consentement est obligatoire pour soumettre la candidature.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCandidature, EMAIL_RE, PHONE_RE };
