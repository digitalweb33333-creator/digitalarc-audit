// ============================================================
// Étape 2 du pipeline : collecte des signaux du site prospect
// ------------------------------------------------------------
// Conforme à la SKILL.md Phase 1 (reconnaissance) : page d'accueil via
// Firecrawl + robots.txt + llms.txt + sitemap.xml (accès crawlers IA).
// Renvoie un objet condensé prêt pour Claude. Non-LIVE -> tout simulé.
// ============================================================
import { env, LIVE } from "../lib/config.js";
import { log } from "../lib/logger.js";

const FIRECRAWL_URL = "https://api.firecrawl.dev/v1/scrape";

function normalizeUrl(raw) {
  let u = String(raw || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u.replace(/\/+$/, "");
}

// Petit GET avec timeout (pour robots/llms/sitemap)
async function fetchText(url, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; DigitalarcAuditBot/1.0)" },
    });
    const body = res.ok ? (await res.text()).slice(0, 4000) : "";
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: "" };
  } finally {
    clearTimeout(t);
  }
}

export async function scrapeSite(websiteRaw) {
  const url = normalizeUrl(websiteRaw);
  if (!url) throw new Error("URL du site manquante.");
  const origin = new URL(url).origin;

  if (!LIVE) {
    log.warn(`[DRY] collecte simulée pour ${url} (AUDIT_LIVE=false, aucun appel réseau)`);
    return {
      url, origin, live: false,
      title: "(simulation)", description: "", statusCode: null,
      markdown: "(Contenu non récupéré — mode simulation.)", html: "", links: [],
      robots: { ok: false, body: "" }, llmsTxt: { ok: false, body: "" }, sitemap: { ok: false, body: "" },
    };
  }

  if (!env.firecrawlKey) throw new Error("FIRECRAWL_API_KEY manquant dans .env");
  log.info(`Firecrawl scrape : ${url}`);

  // Page d'accueil (Firecrawl) + signaux d'accès IA (en parallèle)
  const [fcRes, robots, llmsTxt, sitemap] = await Promise.all([
    fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${env.firecrawlKey}`, "content-type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown", "html", "links"], onlyMainContent: false, waitFor: 3000, timeout: 45000 }),
    }),
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/llms.txt`),
    fetchText(`${origin}/sitemap.xml`),
  ]);

  if (!fcRes.ok) throw new Error(`Firecrawl ${fcRes.status}: ${(await fcRes.text()).slice(0, 300)}`);
  const d = (await fcRes.json()).data || {};

  log.info(
    `Signaux : robots ${robots.ok ? "✓" : "✗"} | llms.txt ${llmsTxt.ok ? "✓" : "✗"} | sitemap ${sitemap.ok ? "✓" : "✗"}`
  );

  return {
    url, origin, live: true,
    title: d.metadata?.title || "",
    description: d.metadata?.description || "",
    statusCode: d.metadata?.statusCode ?? null,
    markdown: (d.markdown || "").slice(0, 12000),
    html: (d.html || "").slice(0, 8000),
    links: (d.links || []).slice(0, 40),
    robots: { ok: robots.ok, body: robots.body.slice(0, 1500) },
    llmsTxt: { ok: llmsTxt.ok, body: llmsTxt.body.slice(0, 800) },
    sitemap: { ok: sitemap.ok, body: sitemap.body.slice(0, 600) },
  };
}
