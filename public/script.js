// --- Analytics (FR-14) --------------------------------------------------
// Point d'extension unique : pousse vers dataLayer (GA4/GTM) si présent,
// sinon log en console pour ne rien perdre pendant le développement.
function trackEvent(name, data) {
  if (window.dataLayer && typeof window.dataLayer.push === 'function') {
    window.dataLayer.push({ event: name, ...data });
  } else {
    console.debug('[analytics]', name, data || {});
  }
}

document.querySelectorAll('[data-track]').forEach((el) => {
  el.addEventListener('click', () => trackEvent(el.dataset.track, { href: el.getAttribute('href') || null }));
});

// --- UTM capture (FR-06) --------------------------------------------------
function captureUtm() {
  const params = new URLSearchParams(window.location.search);
  const utm = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
  };
  const hasUtm = Object.values(utm).some(Boolean);

  if (hasUtm) {
    try {
      sessionStorage.setItem('misdakia_utm', JSON.stringify(utm));
    } catch (e) {
      // stockage indisponible (mode privé) : on continue sans persister
    }
    return utm;
  }

  try {
    const stored = sessionStorage.getItem('misdakia_utm');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

function utmToSourceString(utm) {
  if (!utm) return '';
  return ['utm_source', 'utm_medium', 'utm_campaign']
    .map((key) => utm[key])
    .filter(Boolean)
    .join(' / ');
}

const capturedUtm = captureUtm();

// --- Widgets : squelette de chargement + secours (§6.1, AC-12) -----------
const WIDGET_TIMEOUT_MS = 8000;

document.querySelectorAll('.widget-card').forEach((card) => {
  const container = card.querySelector('.misdakia-widget-container');
  const skeleton = card.querySelector('.widget-skeleton');
  const fallback = card.querySelector('.widget-fallback');
  if (!container) return;

  let settled = false;

  const reveal = () => {
    if (settled) return;
    settled = true;
    if (skeleton) skeleton.classList.add('hidden');
    observer.disconnect();
  };

  const observer = new MutationObserver(() => {
    if (container.childNodes.length > 0) reveal();
  });
  observer.observe(container, { childList: true, subtree: true });

  setTimeout(() => {
    if (settled) return;
    if (container.childNodes.length > 0) {
      reveal();
      return;
    }
    settled = true;
    observer.disconnect();
    if (skeleton) skeleton.classList.add('hidden');
    if (fallback) fallback.classList.remove('hidden');
  }, WIDGET_TIMEOUT_MS);
});

// --- Formulaire de candidature (FR-02, FR-03, section 13) -----------------
const form = document.getElementById('candidature-form');

if (form) {
  const submitButton = document.getElementById('submit-button');
  const statusEl = document.getElementById('form-status');
  const submitButtonDefaultText = submitButton.textContent;

  const validators = {
    prenom: (v) => (v.trim().length >= 2 && v.trim().length <= 50) || 'Le prénom doit contenir entre 2 et 50 caractères.',
    nom: (v) => (v.trim().length >= 2 && v.trim().length <= 50) || 'Le nom doit contenir entre 2 et 50 caractères.',
    telephone: (v) => /^\+?[0-9\s().-]{6,20}$/.test(v.trim()) || 'Merci de saisir un numéro valide avec indicatif pays.',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Merci de saisir une adresse e-mail valide.',
    pays: (v) => v.trim().length >= 2 || 'Merci d’indiquer votre pays d’activité.',
    nombre_produits: (v) => (Number.isInteger(Number(v)) && Number(v) >= 1) || 'Indiquez un nombre de produits d’au moins 1.',
    nombre_boutiques: (v) => (Number.isInteger(Number(v)) && Number(v) >= 1) || 'Indiquez un nombre de boutiques d’au moins 1.',
    ventes_par_jour: (v) => (Number.isInteger(Number(v)) && Number(v) >= 0) || 'Indiquez un nombre de commandes par jour (0 ou plus).',
    ventes_par_mois: (v) => (Number.isInteger(Number(v)) && Number(v) >= 0) || 'Indiquez un nombre de commandes par mois (0 ou plus).',
    ca_mensuel: (v) => (Number.isFinite(Number(v)) && Number(v) >= 0) || 'Indiquez un chiffre d’affaires mensuel valide (0 ou plus).',
    devise: (v) => v.trim().length > 0 || 'Merci de choisir une devise.',
    url_boutique: (v) => v.trim() === '' || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v.trim()) || 'Merci de saisir une URL valide (https://...).',
  };

  function setFieldError(name, message) {
    const field = form.elements[name];
    const errorEl = document.getElementById(`error-${name}`);
    const wrapper = field ? field.closest('.form-field') : null;
    if (errorEl) errorEl.textContent = message || '';
    if (wrapper) wrapper.classList.toggle('has-error', Boolean(message));
  }

  function validateField(name) {
    const field = form.elements[name];
    if (!field || !validators[name]) return true;
    const result = validators[name](field.value);
    setFieldError(name, result === true ? '' : result);
    return result === true;
  }

  function validateConsent() {
    const checked = form.elements.consentement.checked;
    setFieldError('consentement', checked ? '' : 'Le consentement est obligatoire pour soumettre la candidature.');
    return checked;
  }

  Object.keys(validators).forEach((name) => {
    const field = form.elements[name];
    if (field) field.addEventListener('blur', () => validateField(name));
  });
  form.elements.consentement.addEventListener('change', validateConsent);

  function setStatus(message, kind) {
    statusEl.textContent = message;
    statusEl.className = `form-status${kind ? ' ' + kind : ''}`;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const fieldNames = Object.keys(validators);
    const results = fieldNames.map((name) => validateField(name));
    const consentValid = validateConsent();
    const allValid = results.every(Boolean) && consentValid;

    if (!allValid) {
      const firstInvalid = fieldNames.find((name, i) => !results[i]) || 'consentement';
      const el = form.elements[firstInvalid];
      if (el && el.focus) el.focus();
      setStatus('Merci de corriger les champs indiqués ci-dessus.', 'error');
      return;
    }

    // Empêche un double envoi (AC-04)
    if (submitButton.disabled) return;
    submitButton.disabled = true;
    submitButton.textContent = 'Envoi en cours…';
    setStatus('Envoi en cours…', 'pending');

    // FR-06 : les paramètres UTM sont toujours conservés, même si le visiteur choisit une source manuellement.
    const source = [utmToSourceString(capturedUtm), form.elements.source.value]
      .filter(Boolean)
      .join(' | ');

    const payload = {
      prenom: form.elements.prenom.value,
      nom: form.elements.nom.value,
      telephone: form.elements.telephone.value,
      email: form.elements.email.value,
      pays: form.elements.pays.value,
      nombre_produits: Number(form.elements.nombre_produits.value),
      nombre_boutiques: Number(form.elements.nombre_boutiques.value),
      ventes_par_jour: Number(form.elements.ventes_par_jour.value),
      ventes_par_mois: Number(form.elements.ventes_par_mois.value),
      ca_mensuel: Number(form.elements.ca_mensuel.value),
      devise: form.elements.devise.value,
      url_boutique: form.elements.url_boutique.value,
      plateforme: form.elements.plateforme.value,
      source,
      consentement: form.elements.consentement.checked,
    };

    try {
      const response = await fetch('/api/candidature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        // Doublon ou non, on ne révèle jamais d'information sur une candidature existante (§13).
        setStatus('Merci ! Votre candidature a bien été reçue. Notre équipe vous contactera prochainement.', 'success');
        trackEvent('candidature_submitted', { duplicate: Boolean(data.duplicate) });
        form.reset();
        return;
      }

      if (response.status === 400 && data.errors) {
        Object.entries(data.errors).forEach(([name, message]) => setFieldError(name, message));
        setStatus('Merci de corriger les champs indiqués ci-dessus.', 'error');
      } else {
        setStatus(data.message || 'Une erreur est survenue. Veuillez réessayer dans quelques instants.', 'error');
      }
    } catch (err) {
      setStatus('Une erreur est survenue. Veuillez réessayer dans quelques instants.', 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = submitButtonDefaultText;
    }
  });
}
