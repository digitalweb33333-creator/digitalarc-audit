// ============================================================
// Étape 5 du pipeline : log de la demande d'audit vers Make (CRM)
// ------------------------------------------------------------
// Pousse un enregistrement compact au webhook Make MAKE_WEBHOOK_AUDIT.
// Optionnel : si le webhook n'est pas configuré, on ignore silencieusement.
// En mode non-LIVE : aucun appel.
// ============================================================
import { env, LIVE } from "../lib/config.js";
import { log } from "../lib/logger.js";

export async function pushToMake(prospect, audit, meta = {}) {
  if (!env.makeWebhookAudit) {
    log.info("MAKE_WEBHOOK_AUDIT non configuré — log CRM ignoré.");
    return false;
  }
  const record = {
    event: "mini_audit",
    received_at: meta.receivedAt || new Date().toISOString(),
    name: prospect.name || "",
    email: prospect.email || "",
    website: audit?.url || prospect.website || "",
    sector: prospect.sector || "",
    message: prospect.message || "",
    geo_score: audit?.score_global ?? null,
    tier: audit?.tier || "",
    status: meta.status || "audited",
  };

  if (!LIVE) {
    log.warn(`[DRY] CRM Make NON appelé. Payload prêt : ${JSON.stringify(record)}`);
    return false;
  }
  try {
    const res = await fetch(env.makeWebhookAudit, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(record),
    });
    if (res.ok) log.ok("Demande d'audit loggée dans Make.");
    return res.ok;
  } catch (e) {
    log.error(`Échec push Make : ${e.message}`);
    return false;
  }
}
