// ============================================================
// Spécification du mini-audit Digitalarc
// ------------------------------------------------------------
// DEUX sources de vérité, respectées à la lettre :
//  1) digitalarc-creation/1-mini-audit/skills/geo-audit/SKILL.md
//     -> méthodologie & format : 6 catégories pondérées, bandes de score,
//        sévérités Critical/High/Medium/Low, détection du type d'entreprise,
//        structure du rapport (résumé → breakdown → issues → deep dives →
//        quick wins → plan 30 jours).
//  2) Page digitalarc.fr/mini-audit-gratuit
//     -> formulaire = URL + email ; livrables promis = Score SEO +
//        Score visibilité IA (ChatGPT/Perplexity/Gemini, chiffré) +
//        3 priorités ; "résultat sous 24h", gratuit, par email.
//
// L'email prospect met en avant EXACTEMENT la promesse de la page ;
// le rapport markdown complet (pour Joachim) suit le format de la skill.
// ============================================================

// Catégories pondérées (SKILL.md — total 100 %)
export const CATEGORIES = [
  { key: "ai_citability", label: "Citabilité IA", weight: 25 },
  { key: "brand_authority", label: "Autorité de marque", weight: 20 },
  { key: "content_eeat", label: "Contenu & E-E-A-T", weight: 20 },
  { key: "technical", label: "Technique GEO", weight: 15 },
  { key: "schema", label: "Données structurées (Schema)", weight: 10 },
  { key: "platform_optimization", label: "Optimisation plateformes", weight: 10 },
];

// Plateformes IA évaluées (SKILL.md Phase 2 / Subagent 2)
export const AI_PLATFORMS = [
  "Google AI Overviews",
  "ChatGPT Web Search",
  "Perplexity AI",
  "Google Gemini",
  "Bing Copilot",
];

export const SYSTEM_PROMPT = `Tu es l'analyste GEO/SEO de Digitalarc (agence web, digitalarc.fr). Tu réalises un MINI-AUDIT GRATUIT du site d'un prospect, à partir des données réelles fournies (page d'accueil scrapée, robots.txt, llms.txt, sitemap, métadonnées, HTML). Tu écris en FRANÇAIS, ton professionnel et direct.

CONTEXTE — ce que Digitalarc promet sur la page mini-audit-gratuit, à livrer impérativement :
1) un SCORE SEO (référencement Google : technique, contenu, positions) ;
2) un SCORE VISIBILITÉ IA chiffré (présence dans ChatGPT, Perplexity, Gemini) ;
3) 3 PRIORITÉS = les 3 actions à fort impact pour gagner en visibilité dès maintenant.
En plus : un SCORE GLOBAL /100 et le détail méthodologique ci-dessous.

GEO = Generative Engine Optimization : optimiser le site pour que les IA (ChatGPT, Claude, Perplexity, Gemini) le découvrent, le comprennent, le citent et le recommandent. C'est distinct du SEO classique (classement Google) mais complémentaire.

ÉTAPE 1 — TYPE D'ENTREPRISE (champ business_type). Classe le site d'après les signaux :
- SaaS : page de tarifs, "Essai gratuit/Sign up", app.domaine, tableaux comparatifs de features
- Entreprise locale : adresse physique, Google Maps, schema LocalBusiness, pages zones
- E-commerce : listes produits, panier, schema Product, prix, "Ajouter au panier"
- Éditeur : navigation orientée blog, schema Article, pages auteur, archives par date
- Agence / Services : études de cas, portfolio, "Nos réalisations", page équipe, logos clients
- Hybride : combinaison — classe par le motif dominant

BARÈME (6 catégories notées /100, score global = moyenne pondérée) :
- Citabilité IA — 25 % (contenu extractible/citable par les IA, blocs question/réponse, accès crawlers IA, llms.txt)
- Autorité de marque — 20 % (mentions tierces, reconnaissance d'entité : Wikipedia, Reddit, YouTube, LinkedIn, sameAs)
- Contenu & E-E-A-T — 20 % (Expérience, Expertise, Autorité, Confiance : bios auteur, crédentiels, sources, fraîcheur, page À propos)
- Technique GEO — 15 % (accès crawlers IA via robots.txt, llms.txt, rendu/SSR, vitesse, en-têtes, mobile, HTTPS)
- Données structurées — 10 % (JSON-LD : Organization, LocalBusiness, FAQ, HowTo, Product, Article...)
- Optimisation plateformes — 10 % (présence/readiness sur les plateformes que les IA citent)
Formule : global = citability*0.25 + brand*0.20 + eeat*0.20 + technical*0.15 + schema*0.10 + platform*0.10.

CALCUL DES DEUX SCORES DE TÊTE (promesse de la page) :
- score_seo /100 = santé du référencement Google : surtout Technique GEO, Contenu & E-E-A-T, Données structurées.
- score_ia /100 = visibilité dans les moteurs IA : surtout Citabilité IA, Autorité de marque, Optimisation plateformes.
- score_global /100 = moyenne pondérée des 6 catégories (formule ci-dessus).

BANDES (champ tier, SKILL.md) : 90-100 EXCELLENT · 75-89 BON · 60-74 MOYEN · 40-59 FAIBLE · 0-39 CRITIQUE.

READINESS PAR PLATEFORME IA — note /100 chacune avec le principal manque (gap), 1 phrase : ${AI_PLATFORMS.join(", ")}.

SÉVÉRITÉ DES ISSUES (champ severity) — classe chaque problème :
- critique : tous les crawlers IA bloqués (robots.txt) ; aucun contenu indexable (JS sans SSR) ; noindex global ; erreurs 5xx ; aucune donnée structurée ; marque non reconnue comme entité par les IA
- élevé : crawlers IA clés bloqués (GPTBot, ClaudeBot, PerplexityBot) ; pas de llms.txt ; aucun bloc question/réponse ; schema Organization/LocalBusiness absent ; pas d'attribution d'auteur ; contenu derrière login sans aperçu
- moyen : blocage partiel des crawlers IA ; llms.txt incomplet ; faible citabilité des blocs ; FAQ sans schema FAQ ; bios auteur sans crédentiels ; aucune présence Wikipedia/Reddit
- faible : erreurs mineures de schema ; images sans alt ; fraîcheur sur pages secondaires ; balises Open Graph manquantes ; hiérarchie de titres perfectible ; page LinkedIn incomplète

RÈGLES
- Base-toi UNIQUEMENT sur les données fournies. Si une info manque (présence Wikipedia, LinkedIn, schema...), déduis-la des signaux et reste honnête : "non détecté dans les données analysées".
- Ne fabrique jamais un fait, un chiffre ou un concurrent.
- Chaque issue : preuve observée + impact + correctif précis. Les 3 priorités = les 3 actions à plus fort impact (souvent des quick wins critiques/élevés).
- deep_dives : une entrée par catégorie (6) avec un constat court.
- action_plan_30j : 4 semaines, chacune avec un thème et des actions concrètes.
- Montants en euros (€), sauf site manifestement suisse (.ch/CHF).

Réponds STRICTEMENT au format JSON imposé par le schéma. Aucun texte hors JSON.`;

// ---------- Schéma de sortie structurée (output_config.format) ----------
const scorePlatform = {
  type: "object",
  additionalProperties: false,
  properties: { name: { type: "string" }, score: { type: "integer" }, gap: { type: "string" } },
  required: ["name", "score", "gap"],
};
const issueItem = {
  type: "object",
  additionalProperties: false,
  properties: {
    severity: { type: "string", enum: ["critique", "élevé", "moyen", "faible"] },
    title: { type: "string" },
    description: { type: "string" },
    fix: { type: "string" },
    pages: { type: "string" },
  },
  required: ["severity", "title", "description", "fix"],
};
const deepDive = {
  type: "object",
  additionalProperties: false,
  properties: { category: { type: "string" }, score: { type: "integer" }, notes: { type: "string" } },
  required: ["category", "score", "notes"],
};
const priorityItem = {
  type: "object",
  additionalProperties: false,
  properties: { action: { type: "string" }, impact: { type: "string" } },
  required: ["action", "impact"],
};
const weekItem = {
  type: "object",
  additionalProperties: false,
  properties: {
    week: { type: "integer" },
    theme: { type: "string" },
    items: { type: "array", items: { type: "string" } },
  },
  required: ["week", "theme", "items"],
};

export const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    url: { type: "string" },
    brand_name: { type: "string" },
    business_type: {
      type: "string",
      enum: ["SaaS", "Entreprise locale", "E-commerce", "Éditeur", "Agence / Services", "Hybride"],
    },
    score_global: { type: "integer" },
    score_seo: { type: "integer" },
    score_ia: { type: "integer" },
    tier: { type: "string", enum: ["CRITIQUE", "FAIBLE", "MOYEN", "BON", "EXCELLENT"] },
    scores: {
      type: "object",
      additionalProperties: false,
      properties: {
        ai_citability: { type: "integer" },
        brand_authority: { type: "integer" },
        content_eeat: { type: "integer" },
        technical: { type: "integer" },
        schema: { type: "integer" },
        platform_optimization: { type: "integer" },
      },
      required: ["ai_citability", "brand_authority", "content_eeat", "technical", "schema", "platform_optimization"],
    },
    platforms: { type: "array", items: scorePlatform },
    executive_summary: { type: "string" },
    issues: { type: "array", items: issueItem },
    deep_dives: { type: "array", items: deepDive },
    priorities: { type: "array", items: priorityItem },
    action_plan_30j: { type: "array", items: weekItem },
    recommendation: { type: "string" },
  },
  required: [
    "url", "brand_name", "business_type", "score_global", "score_seo", "score_ia",
    "tier", "scores", "platforms", "executive_summary", "issues", "deep_dives",
    "priorities", "action_plan_30j", "recommendation",
  ],
};

// ---------- Helpers de rendu ----------
const esc = (s) =>
  String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const tierColor = (t) =>
  ({ CRITIQUE: "#c0392b", FAIBLE: "#e67e22", MOYEN: "#f1c40f", BON: "#27ae60", EXCELLENT: "#16a085" }[t] || "#534AB7");
const SEV_ORDER = ["critique", "élevé", "moyen", "faible"];

// ---------- Email PROSPECT : exactement la promesse de la page ----------
// (URL analysée + Score global + Score SEO + Score visibilité IA + 3 priorités)
function scoreCard(label, value, sub) {
  return `<td style="text-align:center;padding:8px">
    <div style="font-size:30px;font-weight:800;color:#3C3489;line-height:1">${value}<span style="font-size:15px">/100</span></div>
    <div style="font-size:12px;font-weight:700;color:#534AB7;margin-top:2px">${label}</div>
    <div style="font-size:11px;color:#888">${sub}</div>
  </td>`;
}
export function renderHtmlEmail(a, prospect = {}) {
  const site = "https://digitalarc.fr";
  const prio = (a.priorities || [])
    .slice(0, 3)
    .map(
      (p, i) =>
        `<li style="margin-bottom:8px"><strong>${i + 1}. ${esc(p.action)}</strong><br><span style="color:#534AB7">${esc(p.impact)}</span></li>`
    )
    .join("");
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#222;line-height:1.55;max-width:640px;margin:0 auto">
<div style="background:#0d0d22;color:#EEEDFE;padding:22px 24px;border-radius:10px 10px 0 0">
  <div style="font-size:22px;font-weight:800;letter-spacing:-.5px">Digital<span style="color:#7F77DD">arc</span></div>
  <div style="font-size:11px;letter-spacing:.22em;color:#7F77DD;margin-top:2px">SEO · GEO · AEO · CRÉATION WEB</div>
</div>
<div style="border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 10px 10px">
  <p>Bonjour,</p>
  <p>Voici votre <strong>mini-audit gratuit</strong> pour <strong>${esc(a.url)}</strong> (${esc(a.business_type)}).</p>

  <div style="text-align:center;margin:16px 0">
    <div style="display:inline-block;background:${tierColor(a.tier)};color:#fff;border-radius:12px;padding:14px 26px">
      <div style="font-size:32px;font-weight:800;line-height:1">${a.score_global}<span style="font-size:17px">/100</span></div>
      <div style="font-size:12px;letter-spacing:.1em">SCORE GLOBAL — ${esc(a.tier)}</div>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;border:1px solid #eee;background:#F8F8FF;border-radius:8px"><tr>
    ${scoreCard("Score SEO", a.score_seo, "Google : technique, contenu, positions")}
    ${scoreCard("Score visibilité IA", a.score_ia, "ChatGPT · Perplexity · Gemini")}
  </tr></table>

  <p style="margin-top:18px">${esc(a.executive_summary)}</p>

  <h3 style="color:#3C3489;margin-bottom:6px">Vos 3 priorités (fort impact, dès maintenant)</h3>
  <ol style="padding-left:18px;list-style:none">${prio}</ol>

  <p style="margin-top:18px">${esc(a.recommendation)}</p>

  <p style="text-align:center;margin:24px 0">
    <a href="${site}" style="background:#534AB7;color:#fff;text-decoration:none;font-weight:600;padding:12px 26px;border-radius:8px;display:inline-block">Recevoir l'audit complet & en discuter</a>
  </p>

  <p>Bien à vous,<br>Joachim<br>Digitalarc — <a href="${site}">digitalarc.fr</a></p>
  <p style="font-size:11px;color:#999">Mini-audit gratuit, sans engagement. Diagnostic complet sur demande.</p>
</div>
</body></html>`;
}

// ---------- Rapport COMPLET (markdown, format SKILL.md) — archive / Joachim ----------
export function renderMarkdown(a) {
  const weighted = (k) => Math.round((a.scores[k] * (CATEGORIES.find((c) => c.key === k).weight)) / 100);
  const breakdown = CATEGORIES.map(
    (c) => `| ${c.label} | ${a.scores[c.key]}/100 | ${c.weight}% | ${weighted(c.key)} |`
  ).join("\n");
  const platRows = (a.platforms || [])
    .map((p) => `| ${p.name} | ${p.score}/100 | ${p.gap} |`)
    .join("\n");
  const issuesBy = (sev) =>
    (a.issues || [])
      .filter((i) => i.severity === sev)
      .map((i) => `- **${i.title}** — ${i.description}\n  - _Correctif :_ ${i.fix}${i.pages ? `\n  - _Pages :_ ${i.pages}` : ""}`)
      .join("\n") || "_Aucun._";
  const dives = (a.deep_dives || [])
    .map((d) => `### ${d.category} (${d.score}/100)\n${d.notes}`)
    .join("\n\n");
  const plan = (a.action_plan_30j || [])
    .map((w) => `### Semaine ${w.week} : ${w.theme}\n` + (w.items || []).map((x) => `- [ ] ${x}`).join("\n"))
    .join("\n\n");
  const prio = (a.priorities || []).map((p, i) => `${i + 1}. **${p.action}** — _${p.impact}_`).join("\n");

  return `# Mini-audit GEO — ${a.brand_name}
**URL :** ${a.url}
**Type d'entreprise :** ${a.business_type}

## Résumé exécutif
**Score global : ${a.score_global}/100 (${a.tier})** · SEO ${a.score_seo}/100 · Visibilité IA ${a.score_ia}/100

${a.executive_summary}

### Détail des scores
| Catégorie | Score | Poids | Score pondéré |
|-----------|-------|-------|---------------|
${breakdown}
| **Score global** | | | **${a.score_global}/100** |

### Readiness par plateforme IA
| Plateforme | Score | Principal manque |
|------------|-------|------------------|
${platRows}

## Vos 3 priorités
${prio}

## Problèmes critiques (à corriger immédiatement)
${issuesBy("critique")}

## Problèmes prioritaires (sous 1 semaine)
${issuesBy("élevé")}

## Problèmes moyens (sous 1 mois)
${issuesBy("moyen")}

## Problèmes mineurs (quand possible)
${issuesBy("faible")}

## Analyses détaillées par catégorie
${dives}

## Plan d'action 30 jours
${plan}

## Recommandation
${a.recommendation}

---
*Mini-audit GEO réalisé par Digitalarc — digitalarc.fr — résultat sous 24h*`;
}
