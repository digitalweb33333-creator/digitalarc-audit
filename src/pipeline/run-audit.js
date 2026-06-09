// ============================================================
// Orchestrateur du pipeline mini-audit
// ------------------------------------------------------------
// runAudit(prospect, meta) :
//   1) scrape (Firecrawl)  2) analyse (Claude)  3) sauvegarde livrables
//   4) email (SMTP)        5) log CRM (Make)
// Respecte les garde-fous : en non-LIVE, aucune action externe.
//
// CLI : node src/pipeline/run-audit.js --demo   (prospect de démonstration)
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { dataDir, LIVE, SEND_TO_PROSPECT, parseArgs } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { scrapeSite } from "./scrape.js";
import { analyze } from "./analyze.js";
import { sendAudit } from "./email.js";
import { pushToMake } from "./crm.js";
import { renderMarkdown, renderHtmlEmail } from "../audit-spec.js";
import { renderAuditHtml } from "./pdf-template.js";
import { htmlToPdf } from "./pdf.js";

const slugify = (s) =>
  String(s || "site").toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

export async function runAudit(prospect, meta = {}) {
  const receivedAt = meta.receivedAt || new Date().toISOString();
  if (!prospect.website) throw new Error("Champ 'site web' manquant — impossible d'auditer.");

  log.step(`Mini-audit : ${prospect.name || prospect.website} (${LIVE ? "MODE RÉEL" : "SIMULATION"})`);

  // 1) Scrape
  const scraped = await scrapeSite(prospect.website);

  // 2) Analyse Claude
  const audit = await analyze(prospect, scraped);
  log.ok(`Audit généré : global ${audit.score_global}/100 (${audit.tier}) | SEO ${audit.score_seo} | IA ${audit.score_ia}`);

  // 3) Sauvegarde des livrables
  const stamp = receivedAt.slice(0, 10);
  const slug = slugify(audit.brand_name || prospect.website);
  const base = path.join(dataDir("audits"), `${slug}-${stamp}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify(audit, null, 2), "utf8");
  fs.writeFileSync(`${base}.md`, renderMarkdown(audit), "utf8");
  fs.writeFileSync(`${base}.html`, renderHtmlEmail(audit, prospect), "utf8");
  log.info(`Livrables : ${path.relative(process.cwd(), base)}.{json,md,html}`);

  // 3bis) PDF d'audit (uniquement en mode réel — la simulation renvoie un mock)
  let pdf = null;
  if (LIVE) {
    pdf = await htmlToPdf(renderAuditHtml(audit, prospect));
    if (pdf) { fs.writeFileSync(`${base}.pdf`, pdf); log.ok(`PDF généré (${Math.round(pdf.length / 1024)} Ko)`); }
  }

  // 4) Email (notif Joachim toujours ; prospect seulement si LIVE && SEND_TO_PROSPECT) — PDF joint si dispo
  const mail = await sendAudit(prospect, audit, pdf);

  // 5) CRM Make
  await pushToMake(prospect, audit, { receivedAt, status: mail.sentToProspect ? "sent_to_prospect" : "audited" });

  return { audit, mail, files: `${base}.*` };
}

// ---- CLI de démonstration ----
async function demo() {
  const args = parseArgs();
  if (!args.demo) {
    console.log("Usage : node src/pipeline/run-audit.js --demo");
    return;
  }
  const prospect = {
    name: "Cabinet Test",
    email: "demo@example.com",
    website: "https://digitalarc.fr",
    sector: "agence web",
    message: "Je voudrais améliorer ma visibilité sur ChatGPT.",
  };
  log.warn(
    LIVE
      ? "AUDIT_LIVE=true : appels réels (Firecrawl/Claude/SMTP). " + (SEND_TO_PROSPECT ? "ENVOI PROSPECT ACTIF." : "Envoi prospect désactivé.")
      : "AUDIT_LIVE=false : démonstration sans aucun appel externe."
  );
  const out = await runAudit(prospect, {});
  log.ok(`Terminé. Fichiers : ${out.files}`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("run-audit.js")) {
  demo().catch((e) => {
    log.error(e.stack || e.message);
    process.exit(1);
  });
}
