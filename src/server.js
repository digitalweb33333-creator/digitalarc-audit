// ============================================================
// ÉTAPE 1 — WEBHOOK RECEPTOR
// ------------------------------------------------------------
// Serveur HTTP (natif, sans dépendance) qui écoute les soumissions du
// formulaire Elementor de digitalarc.fr. Récupère : nom, email, site web,
// secteur d'activité, message. Dès réception -> déclenche le pipeline
// d'audit (scrape Firecrawl -> Claude -> SMTP -> Make).
//
// Robustesse : accepte JSON et x-www-form-urlencoded, et la structure
// imbriquée d'Elementor (fields[<id>][value]). Mapping de champs tolérant.
//
// Sécurité : aucun envoi/scraping réel tant que AUDIT_LIVE=false (.env).
// Démarrage : npm start  (ne PAS lancer avant le feu vert "LANCE").
//
// Endpoints :
//   POST {WEBHOOK_PATH}  -> reçoit le formulaire, répond 200, lance l'audit
//   GET  /health         -> liveness
// ============================================================
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { env, LIVE, SEND_TO_PROSPECT, dataDir } from "./lib/config.js";
import { log } from "./lib/logger.js";
import { runAudit } from "./pipeline/run-audit.js";

// --- Parsing du corps de requête --------------------------------------------
function parseBody(req, raw) {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  const text = raw.toString("utf8");
  if (!text) return {};
  if (ct.includes("application/json")) {
    try { return JSON.parse(text); } catch { return {}; }
  }
  // x-www-form-urlencoded (cas Elementor par défaut) -> objet imbriqué
  if (ct.includes("application/x-www-form-urlencoded")) {
    const out = {};
    for (const [k, v] of new URLSearchParams(text)) setNested(out, k, v);
    return out;
  }
  // dernier recours : tenter JSON
  try { return JSON.parse(text); } catch { return {}; }
}

// "fields[email][value]" = x  ->  out.fields.email.value = x
function setNested(obj, key, value) {
  const parts = key.replace(/\]/g, "").split("[");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] || {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// --- Extraction tolérante d'un champ ----------------------------------------
const FIELD_MAP = {
  name: ["name", "nom", "fullname", "full_name", "your-name", "prenom", "prénom"],
  email: ["email", "mail", "e-mail", "your-email", "courriel"],
  website: ["website", "site", "url", "site-web", "site_web", "siteweb", "web", "site-internet"],
  sector: ["sector", "secteur", "activite", "activité", "secteur-activite", "industry", "domaine", "metier", "métier"],
  message: ["message", "msg", "comment", "commentaire", "besoin", "question", "remarque"],
};

function pick(body, candidates) {
  const fields = body.fields || {};
  for (const c of candidates) {
    // direct
    if (body[c] != null && typeof body[c] !== "object") return String(body[c]).trim();
    // Elementor : fields[c].value ou fields[c]
    const f = fields[c];
    if (f != null) {
      if (typeof f === "object" && f.value != null) return String(f.value).trim();
      if (typeof f !== "object") return String(f).trim();
    }
  }
  // scan : un sous-objet fields dont l'id correspond
  for (const [, f] of Object.entries(fields)) {
    if (f && typeof f === "object" && candidates.includes(String(f.id || "").toLowerCase())) {
      if (f.value != null) return String(f.value).trim();
    }
  }
  return "";
}

function normalizeSubmission(body) {
  return {
    name: pick(body, FIELD_MAP.name),
    email: pick(body, FIELD_MAP.email),
    website: pick(body, FIELD_MAP.website),
    sector: pick(body, FIELD_MAP.sector),
    message: pick(body, FIELD_MAP.message),
  };
}

// --- Validation du secret partagé (optionnel) -------------------------------
function secretOk(req, body, url) {
  if (!env.webhookSecret) return true;
  const provided =
    req.headers["x-webhook-secret"] ||
    url.searchParams.get("secret") ||
    body.secret ||
    (body.fields && body.fields.secret && body.fields.secret.value);
  return provided === env.webhookSecret;
}

// --- Serveur ----------------------------------------------------------------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const json = (code, obj) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(obj));
  };

  if (req.method === "GET" && url.pathname === "/health") {
    return json(200, { ok: true, live: LIVE, sendToProspect: SEND_TO_PROSPECT });
  }
  if (req.method === "GET" && url.pathname === "/") {
    return json(200, { service: "digitalarc-audit", webhook: env.webhookPath, live: LIVE });
  }
  if (req.method !== "POST" || url.pathname !== env.webhookPath) {
    return json(404, { error: "not found" });
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = parseBody(req, Buffer.concat(chunks));

    if (!secretOk(req, body, url)) {
      log.warn("Webhook refusé : secret invalide.");
      return json(401, { error: "invalid secret" });
    }

    const prospect = normalizeSubmission(body);
    const receivedAt = new Date().toISOString();

    // Archive brute de la soumission
    const subFile = path.join(dataDir("submissions"), `${receivedAt.replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(subFile, JSON.stringify({ receivedAt, prospect, rawKeys: Object.keys(body) }, null, 2), "utf8");

    // Le formulaire mini-audit-gratuit demande exactement 2 champs : URL + email.
    if (!prospect.website || !prospect.email) {
      log.warn(`Soumission incomplète (URL=${prospect.website || "?"}, email=${prospect.email || "?"}). Champs reçus : ${Object.keys(body).join(", ")}`);
      return json(422, { error: "URL du site et email professionnel requis", got: Object.keys(body) });
    }

    log.step(`Soumission reçue : ${prospect.name || "?"} <${prospect.email || "?"}> — ${prospect.website || "(pas de site)"}`);

    // Réponse immédiate à Elementor (évite les timeouts), traitement en tâche de fond
    json(200, { ok: true, message: "audit en cours", live: LIVE });

    runAudit(prospect, { receivedAt })
      .then((out) => log.ok(`Audit terminé pour ${prospect.website} -> ${out.files}`))
      .catch((e) => log.error(`Pipeline échec (${prospect.website}) : ${e.message}`));
  });
});

server.listen(env.port, () => {
  log.step(`Webhook receptor démarré`);
  log.info(`Écoute : http://localhost:${env.port}${env.webhookPath}`);
  log.info(`Mode : ${LIVE ? "RÉEL (appels externes actifs)" : "SIMULATION (aucun appel externe)"} | Envoi prospect : ${SEND_TO_PROSPECT ? "ON" : "OFF"}`);
  if (!LIVE) log.warn("AUDIT_LIVE=false : les soumissions sont traitées mais AUCUN scrape/IA/email réel. Mettre AUDIT_LIVE=true après le feu vert.");
});
