// ============================================================
// Étape 3 du pipeline : génération du mini-audit via l'API Claude
// ------------------------------------------------------------
// fetch natif. Modèle claude-opus-4-8. Sortie JSON structurée
// (output_config.format / AUDIT_SCHEMA). Gros system prompt mis en cache
// (cache_control ephemeral). Non-LIVE -> audit simulé.
// ============================================================
import { env, LIVE } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { SYSTEM_PROMPT, AUDIT_SCHEMA, AI_PLATFORMS } from "../audit-spec.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function buildUserContent(prospect, s) {
  return [
    `SITE À AUDITER (formulaire mini-audit-gratuit) :`,
    `- URL : ${s.url}`,
    `- Email du prospect : ${prospect.email || "(non fourni)"}`,
    ``,
    `SIGNAUX D'ACCÈS IA :`,
    `- robots.txt : ${s.robots?.ok ? "présent" : "absent/inaccessible"}`,
    s.robots?.body ? `  --- robots.txt ---\n${s.robots.body}` : "",
    `- llms.txt : ${s.llmsTxt?.ok ? "PRÉSENT" : "ABSENT"}`,
    s.llmsTxt?.body ? `  --- llms.txt ---\n${s.llmsTxt.body}` : "",
    `- sitemap.xml : ${s.sitemap?.ok ? "présent" : "absent"}`,
    ``,
    `DONNÉES PAGE D'ACCUEIL :`,
    `- Titre (meta) : ${s.title || "(vide)"}`,
    `- Description (meta) : ${s.description || "(vide)"}`,
    `- Code HTTP : ${s.statusCode ?? "?"}`,
    `- Liens détectés (${s.links.length}) : ${s.links.slice(0, 25).join(", ") || "(aucun)"}`,
    ``,
    `CONTENU (markdown, tronqué) :`,
    s.markdown || "(vide)",
    ``,
    `EXTRAIT HTML BRUT (détecter JSON-LD / Open Graph / balises, tronqué) :`,
    s.html || "(vide)",
    ``,
    `Produis le mini-audit au format JSON imposé : détecte business_type, calcule score_seo, score_ia et score_global, note les 6 catégories et les 5 plateformes (${AI_PLATFORMS.join(", ")}), liste les issues par sévérité, 6 deep_dives, EXACTEMENT 3 priorities, et un action_plan_30j sur 4 semaines.`,
  ].filter(Boolean).join("\n");
}

// Audit simulé (mode non-LIVE) — structure complète conforme au schéma.
function mockAudit(prospect, s) {
  return {
    url: s.url,
    brand_name: prospect.name || s.title || s.url,
    business_type: "Hybride",
    score_global: 0, score_seo: 0, score_ia: 0, tier: "CRITIQUE",
    scores: { ai_citability: 0, brand_authority: 0, content_eeat: 0, technical: 0, schema: 0, platform_optimization: 0 },
    platforms: AI_PLATFORMS.map((name) => ({ name, score: 0, gap: "(simulation — non analysé)" })),
    executive_summary:
      "SIMULATION (AUDIT_LIVE=false). Aucun appel à Claude/Firecrawl n'a été effectué. " +
      "Active AUDIT_LIVE pour générer un vrai audit.",
    issues: [
      { severity: "critique", title: "Audit non généré (mode simulation)", description: "Pipeline branché, appels externes désactivés.", fix: "Définir AUDIT_LIVE=true.", pages: s.url },
    ],
    deep_dives: [
      { category: "Citabilité IA", score: 0, notes: "(simulation)" },
      { category: "Autorité de marque", score: 0, notes: "(simulation)" },
      { category: "Contenu & E-E-A-T", score: 0, notes: "(simulation)" },
      { category: "Technique GEO", score: 0, notes: "(simulation)" },
      { category: "Données structurées", score: 0, notes: "(simulation)" },
      { category: "Optimisation plateformes", score: 0, notes: "(simulation)" },
    ],
    priorities: [
      { action: "Activer le mode réel", impact: "déclenche l'audit Claude" },
      { action: "Fournir ANTHROPIC_API_KEY", impact: "requis pour l'analyse" },
      { action: "Dire LANCE", impact: "feu vert pour les audits réels" },
    ],
    action_plan_30j: [
      { week: 1, theme: "Configuration", items: ["AUDIT_LIVE=true", "Vérifier les clés"] },
      { week: 2, theme: "—", items: [] },
      { week: 3, theme: "—", items: [] },
      { week: 4, theme: "—", items: [] },
    ],
    recommendation: "Simulation — configurez puis dites LANCE pour un audit réel.",
  };
}

export async function analyze(prospect, scraped) {
  if (!LIVE) {
    log.warn("[DRY] analyse Claude simulée (AUDIT_LIVE=false, aucun appel API)");
    return mockAudit(prospect, scraped);
  }
  if (!env.anthropicKey) throw new Error("ANTHROPIC_API_KEY manquant dans .env");

  log.info(`Claude (${env.anthropicModel}) : génération de l'audit pour ${scraped.url}`);
  const body = {
    model: env.anthropicModel,
    max_tokens: 8000,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    output_config: { format: { type: "json_schema", schema: AUDIT_SCHEMA } },
    messages: [{ role: "user", content: buildUserContent(prospect, scraped) }],
  };

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();

  const usage = json.usage || {};
  log.info(
    `Tokens : in=${usage.input_tokens ?? "?"} cache_read=${usage.cache_read_input_tokens ?? 0} out=${usage.output_tokens ?? "?"}`
  );

  const text = (json.content || []).find((b) => b.type === "text")?.text || "";
  if (!text) throw new Error("Réponse Claude sans bloc texte JSON.");
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON d'audit invalide : ${e.message} — début: ${text.slice(0, 200)}`);
  }
}
