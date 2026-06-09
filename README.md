# Digitalarc Audit

Automatisation des **mini-audits GEO/SEO** pour digitalarc.fr.
Un prospect remplit le formulaire Elementor → le système scrape son site,
génère un mini-audit GEO avec Claude, l'envoie par email et logge la demande.

## Pipeline

```
1. WEBHOOK    Formulaire Elementor      -> src/server.js (URL du site + email pro)
2. SCRAPE     Firecrawl + robots/llms/sitemap -> signaux d'accès IA + contenu
3. ANALYSE    Claude (claude-opus-4-8)  -> mini-audit structuré (JSON)
4. LIVRABLES  data/audits/              -> .json + .md (rapport complet) + .html (email)
5. EMAIL      SMTP Hostinger            -> notif Joachim (+ prospect si activé)
6. CRM        Make (webhook)            -> log de la demande (onglet Audits)
```

## Deux sources de vérité (respectées à la lettre)

- **Méthodologie & format** = `digitalarc-creation/1-mini-audit/skills/geo-audit/SKILL.md` :
  6 catégories pondérées (Citabilité IA 25 %, Autorité 20 %, E-E-A-T 20 %,
  Technique 15 %, Schema 10 %, Plateformes 10 %), bandes 90-100 Excellent →
  0-39 Critique, sévérités Critical/High/Medium/Low, détection du type
  d'entreprise, rapport : résumé → breakdown pondéré → issues par sévérité →
  deep dives → plan 30 jours.
- **Promesse au prospect** = page `digitalarc.fr/mini-audit-gratuit` :
  formulaire **URL + email** ; livrables = **Score SEO** + **Score visibilité IA**
  (ChatGPT/Perplexity/Gemini, chiffré) + **3 priorités** ; « résultat sous 24h »,
  gratuit, par email. C'est exactement ce que met en avant l'email envoyé.

## Garde-fous (IMPORTANT)

Rien ne part en réel tant que les drapeaux `.env` ne sont pas activés :

| Variable | Effet |
|---|---|
| `AUDIT_LIVE=false` | **Aucun** appel externe (Firecrawl/Claude/SMTP/Make). Tout est simulé. |
| `AUDIT_SEND_TO_PROSPECT=false` | Même en LIVE, l'audit n'est **pas** envoyé au prospect — seulement à `NOTIFY_EMAIL` pour relecture. |

Montée recommandée : `AUDIT_LIVE=true` (audits réels, envoyés seulement à Joachim) →
vérifier la qualité → `AUDIT_SEND_TO_PROSPECT=true` (envoi automatique au prospect).

## Démarrage

```bash
npm install
cp .env.example .env     # puis renseigner ANTHROPIC_API_KEY (les autres clés sont déjà là)

# Test à blanc (aucun appel externe) :
npm run audit:demo

# Démarrer le serveur webhook :
npm start                # écoute http://localhost:3000/webhook/audit
```

## Brancher le formulaire Elementor

Dans Elementor : formulaire → **Actions après soumission** → **Webhook** →
URL = `https://<ton-serveur>:3000/webhook/audit` (exposer le port en HTTPS via
un reverse proxy / tunnel). Mettre les **ID de champ** sur : `name`, `email`,
`website`, `sector`, `message` (le récepteur accepte aussi `nom`, `site`,
`secteur`, etc.). Secret optionnel : `WEBHOOK_SECRET` (+ champ `secret` côté form).

## État des clés

| Service | Clé | État |
|---|---|---|
| Firecrawl | `FIRECRAWL_API_KEY` | ✅ réutilisée (digitalarc-prospection) |
| SMTP Hostinger | `SMTP_USER`/`SMTP_PASS` | ✅ boîte contact@ |
| Make | `MAKE_WEBHOOK_AUDIT` | ⚠️ optionnel, à créer si log CRM voulu |
| **Claude / Anthropic** | `ANTHROPIC_API_KEY` | ❌ **à fournir** (aucune clé existante trouvée) |

## Structure

```
src/server.js            ÉTAPE 1 — récepteur webhook Elementor
src/audit-spec.js        system prompt + schéma JSON + rendus md/html
src/pipeline/scrape.js   Firecrawl
src/pipeline/analyze.js  Claude (fetch natif, sortie JSON, prompt caching)
src/pipeline/email.js    SMTP Hostinger
src/pipeline/crm.js      Make
src/pipeline/run-audit.js orchestrateur
data/submissions/        soumissions brutes
data/audits/             audits générés (.json/.md/.html)
```
