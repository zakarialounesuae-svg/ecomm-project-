const { google } = require('googleapis');

const SHEET_HEADERS = [
  'id_candidature', 'date_soumission', 'prenom', 'nom', 'telephone', 'email',
  'pays', 'nombre_produits', 'nombre_boutiques', 'ventes_par_jour',
  'ventes_par_mois', 'ca_mensuel', 'devise', 'url_boutique', 'plateforme',
  'source', 'consentement', 'statut', 'notes',
];

let sheetsClient = null;

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Identifiants Google Sheets manquants (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY).');
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

function isConfigured() {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  );
}

function getTabName() {
  return process.env.GOOGLE_SHEET_TAB || 'Candidatures';
}

/**
 * Reads existing telephone/email columns to flag probable duplicates (FR-08).
 * Never throws — a read failure just means the duplicate check is skipped.
 */
async function findExistingByPhoneOrEmail(telephone, email) {
  try {
    const sheets = getSheetsClient();
    const range = `${getTabName()}!E:F`; // telephone, email columns
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range,
    });
    const rows = res.data.values || [];
    const normalizedPhone = telephone.replace(/[\s().-]/g, '');
    const normalizedEmail = email.trim().toLowerCase();

    return rows.some(([rowPhone, rowEmail]) => {
      const phoneMatch = rowPhone && rowPhone.replace(/[\s().-]/g, '') === normalizedPhone;
      const emailMatch = rowEmail && rowEmail.trim().toLowerCase() === normalizedEmail;
      return phoneMatch || emailMatch;
    });
  } catch (err) {
    console.error('[sheets] duplicate check failed, continuing without it:', err.message);
    return false;
  }
}

/**
 * Appends one row for a candidature. Column order MUST match SHEET_HEADERS
 * (see PRD §8). Returns once Google confirms the write (AC-01).
 */
async function appendCandidature(row) {
  const sheets = getSheetsClient();
  const values = [SHEET_HEADERS.map((key) => row[key] ?? '')];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${getTabName()}!A:S`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

module.exports = { appendCandidature, findExistingByPhoneOrEmail, isConfigured, SHEET_HEADERS };
