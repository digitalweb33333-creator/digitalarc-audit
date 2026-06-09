// Chargement centralisé de la config + .env
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..", "..");

// Crée un dossier sous data/ et renvoie son chemin absolu
export function dataDir(sub) {
  const dir = path.join(ROOT, "data", sub);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Parseur d'arguments CLI : --flag ou --key=value
export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (const a of argv) {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      args[k] = v === undefined ? true : v;
    } else args._.push(a);
  }
  return args;
}

// --- GARDE-FOUS : rien ne part en réel sans activation explicite ---
// LIVE=false  -> aucun appel externe (Firecrawl/Claude/SMTP/Make), tout est simulé.
// SEND_TO_PROSPECT=false -> même en LIVE, l'audit n'est PAS envoyé au prospect,
//                           seulement à NOTIFY_EMAIL (Joachim) pour relecture.
export const LIVE = String(process.env.AUDIT_LIVE || "false") === "true";
export const SEND_TO_PROSPECT = String(process.env.AUDIT_SEND_TO_PROSPECT || "false") === "true";

export const env = {
  // Firecrawl
  firecrawlKey: process.env.FIRECRAWL_API_KEY || "",
  // Claude / Anthropic
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
  // SMTP Hostinger
  smtpHost: process.env.SMTP_HOST || "smtp.hostinger.com",
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: String(process.env.SMTP_SECURE || "true") === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  senderName: process.env.SENDER_NAME || "Joachim - Digitalarc",
  senderWebsite: process.env.SENDER_WEBSITE || "https://digitalarc.fr",
  replyTo: process.env.SENDER_REPLY_TO || "contact@digitalarc.fr",
  notifyEmail: process.env.NOTIFY_EMAIL || "joachim33333@outlook.fr",
  // Resend (API email HTTPS — fonctionne là où le SMTP est bloqué, ex. Render)
  resendKey: process.env.RESEND_API_KEY || "",
  resendFrom: process.env.RESEND_FROM || "Joachim - Digitalarc <onboarding@resend.dev>",
  // Make (log CRM des demandes d'audit)
  makeWebhookAudit: process.env.MAKE_WEBHOOK_AUDIT || "",
  // Serveur webhook — PORT est injecté par Render/Railway ; WEBHOOK_PORT en local
  port: Number(process.env.PORT || process.env.WEBHOOK_PORT || 3000),
  webhookPath: process.env.WEBHOOK_PATH || "/webhook/audit",
  webhookSecret: process.env.WEBHOOK_SECRET || "",
};
