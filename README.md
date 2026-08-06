# Misdakia — Landing page bêta (widgets + candidature)

Landing page de démonstration pour Misdakia : elle présente le widget d'avis produit
(`WI-AIOG85`) et le widget de note globale boutique (`WI-0BKWHE`) en direct, et
collecte les candidatures des e-commerçants intéressés par la bêta. Conforme au
PRD *Landing Page Widgets Misdakia V2*.

## Architecture

```
public/            Frontend statique (HTML/CSS/JS vanilla, aucune dépendance de build)
server/            API Express : validation, anti-spam, écriture dans Google Sheets
```

Conformément à la section 11 du PRD, le compte de service Google (les identifiants
qui permettent d'écrire dans la feuille) ne vit **que côté serveur** — le
navigateur n'y a jamais accès.

Flux d'une candidature :
`navigateur → validation front → POST /api/candidature → validation serveur
→ anti-spam → vérification de doublon → écriture Google Sheets → réponse`

## Installation

```bash
npm install
cp .env.example .env   # puis renseigner les variables (voir ci-dessous)
npm start               # ou: npm run dev (rechargement automatique)
```

Le site est servi sur `http://localhost:3000` (ou le port défini par `PORT`).

## Configuration Google Sheets

1. Créer une feuille Google Sheets dédiée et un onglet (par défaut `Candidatures`,
   configurable via `GOOGLE_SHEET_TAB`).
2. Ajouter en ligne 1 les en-têtes suivants, dans cet ordre exact (section 8 du PRD) :

   | Col | Nom technique |
   |-----|----------------|
   | A | id_candidature |
   | B | date_soumission |
   | C | prenom |
   | D | nom |
   | E | telephone |
   | F | email |
   | G | pays |
   | H | nombre_produits |
   | I | nombre_boutiques |
   | J | ventes_par_jour |
   | K | ventes_par_mois |
   | L | ca_mensuel |
   | M | devise |
   | N | url_boutique |
   | O | plateforme |
   | P | source |
   | Q | consentement |
   | R | statut |
   | S | notes |

3. Créer un compte de service Google Cloud avec l'API Google Sheets activée,
   puis **partager la feuille avec l'e-mail du compte de service en accès
   "Éditeur"** (ne pas donner un accès plus large que nécessaire).
4. Renseigner dans `.env` :
   - `GOOGLE_SHEET_ID` (l'identifiant présent dans l'URL de la feuille)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (clé privée PEM du compte de service)

Tant que ces variables ne sont pas renseignées, l'API répond `503` avec un
message clair au lieu de planter (le site et le formulaire restent affichés).

## Règles d'exploitation de la feuille (section 8.1)

- Créer une vue filtrée « Nouveaux prospects » où `statut = Nouveau`.
- Appliquer une liste déroulante sur la colonne `statut`
  (Nouveau, À contacter, Qualifié, Retenu, Refusé).
- Protéger les colonnes A (id), B (date) et Q (consentement) contre les
  modifications accidentelles.
- Limiter l'accès à la feuille aux membres autorisés de l'équipe Misdakia.

## Point de vigilance avant le lancement public

Le script des widgets pointe actuellement vers l'environnement de **staging** :

```
https://misdakia-staging.t4startups.com/widget-script.js
```

Avant le lancement public, remplacer ce domaine par l'URL de production validée
dans `public/index.html` **et** dans la directive CSP du serveur (variable
`MISDAKIA_WIDGET_ORIGIN` dans `.env`), puis vérifier que le clic sur le widget
produit ouvre bien la page publique attendue (AC-11).

## Sécurité & conformité au PRD

- **CSP** : seul le domaine Misdakia nécessaire au script/aux requêtes du
  widget est autorisé (`helmet` configuré dans `server/index.js`).
- **Anti-spam** (FR-10) : limitation de débit par IP sur `/api/candidature`
  (`RATE_LIMIT_MAX_REQUESTS` requêtes par `RATE_LIMIT_WINDOW_MINUTES` minutes).
- **Doublons** (FR-08) : une candidature dont le téléphone ou l'e-mail existe
  déjà est tout de même enregistrée (annotée en colonne `notes`), mais
  l'utilisateur reçoit le même message de succès générique — aucune
  information sur une candidature existante n'est révélée.
- **Double soumission** (AC-04) : le bouton d'envoi est désactivé dès le
  premier clic, côté client.
- **Résilience widgets** (AC-12) : un squelette de chargement s'affiche avant
  l'initialisation ; si le script échoue ou met plus de 8 secondes, un message
  de secours apparaît sans jamais bloquer le reste de la page, les CTA ou le
  formulaire.
- **Traçabilité** : les erreurs serveur sont journalisées sans les données
  personnelles du candidat.
- **NULL vs valeurs par défaut** : les champs numériques obligatoires sont
  validés côté serveur (`server/validate.js`) indépendamment du frontend
  (FR-03).

## Développement

```bash
npm run dev     # redémarre automatiquement le serveur à chaque modification
```

Le frontend (`public/`) est du HTML/CSS/JS vanilla sans étape de build : toute
modification y est visible après un simple rechargement de page.
