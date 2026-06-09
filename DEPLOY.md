# Déploiement — URL HTTPS fixe (sans toucher au DNS de digitalarc.fr)

Objectif : héberger le serveur webhook pour obtenir une URL permanente
`https://<service>/webhook/audit` à coller une fois pour toutes dans Elementor.

Le projet est prêt : `render.yaml` (blueprint Render), `Dockerfile` (portable),
serveur qui écoute sur `$PORT`, `.env` et `data/` ignorés par git (aucun secret committé).

---

## Option 1 — Render (gratuit, recommandé)

### A. Mettre le code sur GitHub
```bash
cd ~/digitalarc-audit
git init && git add -A && git commit -m "digitalarc-audit: déploiement"
# Crée un repo PRIVÉ sur github.com (ex. digitalarc-audit), puis :
git branch -M main
git remote add origin https://github.com/<ton-compte>/digitalarc-audit.git
git push -u origin main
```

### B. Créer le service sur Render
1. render.com → **New** → **Blueprint** → connecte ton compte GitHub → choisis le repo.
2. Render détecte `render.yaml` et propose le service `digitalarc-audit`.
3. Il demande les **secrets** (marqués `sync:false`) — saisis-les :
   - `FIRECRAWL_API_KEY`, `ANTHROPIC_API_KEY`, `SMTP_PASS`, `MAKE_WEBHOOK_AUDIT`, `WEBHOOK_SECRET` (optionnel)
   - (les valeurs sont dans `~/digitalarc-audit/.env`)
4. **Create** → premier déploiement (~2-3 min).

### C. URL finale
```
https://digitalarc-audit.onrender.com/webhook/audit
```
(le nom exact est affiché dans Render). → à coller dans Elementor.

> **Cold start (plan free)** : le service se met en veille après 15 min d'inactivité.
> La 1re soumission après une pause peut attendre ~30-60 s le réveil. Deux solutions :
> - garder chaud avec un ping `/health` toutes les 10 min (cron-job.org), ou
> - passer au plan **Starter (~7 $/mois)** = always-on (recommandé en production).

---

## Option 2 — Railway (déploie le code local, sans GitHub)

```bash
npm i -g @railway/cli
railway login                     # interactif (navigateur)
cd ~/digitalarc-audit
railway init                      # crée le projet
railway up                        # déploie le dossier courant (utilise le Dockerfile)
```
Puis dans le dashboard Railway → **Variables** : ajoute toutes les variables
(voir tableau ci-dessous), et **Settings → Networking → Generate Domain**.

URL finale :
```
https://<projet>.up.railway.app/webhook/audit
```
> Railway n'a plus de plan 100 % gratuit (crédit d'essai puis usage payant), mais
> il est always-on (pas de cold start) et déploie le code local sans passer par GitHub.

---

## Variables d'environnement à définir (dashboard)

| Variable | Valeur | Secret |
|---|---|:--:|
| `AUDIT_LIVE` | `true` | |
| `AUDIT_SEND_TO_PROSPECT` | `false` | |
| `WEBHOOK_PATH` | `/webhook/audit` | |
| `ANTHROPIC_MODEL` | `claude-opus-4-8` | |
| `SMTP_HOST` | `smtp.hostinger.com` | |
| `SMTP_PORT` | `465` | |
| `SMTP_SECURE` | `true` | |
| `SMTP_USER` | `contact@digitalarc.fr` | |
| `SENDER_NAME` | `Joachim - Digitalarc` | |
| `SENDER_WEBSITE` | `https://digitalarc.fr` | |
| `SENDER_REPLY_TO` | `contact@digitalarc.fr` | |
| `NOTIFY_EMAIL` | `joachim33333@outlook.fr` | |
| `FIRECRAWL_API_KEY` | (voir .env) | ✅ |
| `ANTHROPIC_API_KEY` | (voir .env) | ✅ |
| `SMTP_PASS` | (voir .env) | ✅ |
| `MAKE_WEBHOOK_AUDIT` | (voir .env) | ✅ |
| `WEBHOOK_SECRET` | (optionnel) | ✅ |

Sur Render avec `render.yaml`, les variables non secrètes sont déjà pré-remplies ;
seuls les `✅` sont à saisir à la main.

---

## Notes

- **Fichiers `data/` éphémères** : sur l'hébergeur, `data/audits` et `data/submissions`
  sont effacés à chaque redéploiement. Ce n'est pas grave : l'email (NOTIFY_EMAIL) et
  le log Make/Sheets sont les enregistrements durables.
- **Go-live** : `AUDIT_LIVE=true` + `AUDIT_SEND_TO_PROSPECT=false` → chaque soumission
  génère un audit réel envoyé **uniquement à toi**. Passe `AUDIT_SEND_TO_PROSPECT=true`
  le jour où tu veux l'envoi automatique au prospect.
- **Elementor** : action Webhook → URL = `https://<service>/webhook/audit`, champs `url` + `email`.
- Une fois déployé, l'URL `*.trycloudflare.com` temporaire et le tunnel local ne servent plus.
