# Tunnel nommé Cloudflare — URL fixe pour Elementor

Objectif : remplacer l'URL temporaire `*.trycloudflare.com` par une URL **permanente**
`https://audit.digitalarc.fr/webhook/audit` à coller une fois pour toutes dans Elementor.

## Prérequis (décision à prendre)

Un tunnel nommé avec hostname custom exige que la zone DNS soit sur **Cloudflare**.
Or `digitalarc.fr` est aujourd'hui géré par **Hostinger** (NS `dns-parking.com`).

- **Option A (recommandée pour le tunnel)** : ajouter `digitalarc.fr` à un compte
  Cloudflare (gratuit) et basculer les NS chez ton registrar vers ceux de Cloudflare.
  Une fois fait, l'étape « route dns » ci-dessous crée le CNAME automatiquement.
- **Option B (sans toucher au DNS)** : ne pas utiliser de tunnel nommé, mais **héberger**
  le serveur (Render / Railway / VPS) → URL HTTPS fixe sans Cloudflare. Souvent plus
  simple pour un simple récepteur de webhook. (Demande-moi si tu préfères cette voie.)

## Étapes (Option A)

cloudflared est installé ici :
`C:\Users\joach\AppData\Local\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe`
(un nouveau terminal l'a aussi via le PATH, simplement `cloudflared`).

1. **Connexion (INTERACTIF — navigateur, à faire toi-même)**
   ```powershell
   cloudflared tunnel login
   ```
   Choisis la zone `digitalarc.fr` (elle doit déjà être sur Cloudflare — Option A).

2. **Créer le tunnel**
   ```powershell
   cloudflared tunnel create digitalarc-audit
   ```
   Note le **TUNNEL_ID** affiché et reporte-le dans `config.yml` (champ tunnel/credentials-file).

3. **Router le DNS (crée le CNAME audit.digitalarc.fr -> tunnel)**
   ```powershell
   cloudflared tunnel route dns digitalarc-audit audit.digitalarc.fr
   ```

4. **Lancer le tunnel** (avec ce fichier de config)
   ```powershell
   cloudflared tunnel run --config "\\wsl.localhost\Ubuntu\home\joachim\digitalarc-audit\cloudflared\config.yml" digitalarc-audit
   ```

5. **Le rendre permanent (service Windows, démarre au boot)**
   ```powershell
   cloudflared service install
   ```
   (Pense aussi à faire tourner le serveur Node en permanence : tâche planifiée au
   démarrage, ou pm2, exécutant `node src/server.js` dans digitalarc-audit.)

## Résultat

URL fixe à coller dans Elementor (définitif) :
```
https://audit.digitalarc.fr/webhook/audit
```

> Une fois l'étape 1 (login) faite de ton côté, dis-le-moi : je peux enchaîner la
> création du tunnel, le remplissage du config.yml et le routage DNS avec toi.
