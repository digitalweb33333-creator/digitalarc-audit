// ============================================================
// Template HTML du PDF d'audit (charte Digitalarc) — piloté par le JSON
// produit par analyze.js (AUDIT_SCHEMA). Rendu A4 par pdf.js (puppeteer).
// ============================================================
const ACCENT = "#7c6ff7", DARK = "#0d0f1f";
const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const colorFor = (s) => s >= 85 ? "#34d399" : s >= 70 ? ACCENT : s >= 50 ? "#f59e0b" : "#ef4444";
const tierFor = (s) => s >= 85 ? "EXCELLENT" : s >= 70 ? "BON" : s >= 60 ? "MOYEN" : s >= 40 ? "FAIBLE" : "CRITIQUE";
const STATUS = { critique: ["✗", "#ef4444", "Critique"], "élevé": ["!", "#f59e0b", "Élevé"], moyen: ["!", "#f59e0b", "Moyen"], faible: ["•", "#10b981", "Faible"] };

const CATS = [
  { key: "ai_citability", icon: "🤖", label: "Citabilité IA", weight: 25 },
  { key: "brand_authority", icon: "🏆", label: "Autorité de marque", weight: 20 },
  { key: "content_eeat", icon: "✍️", label: "Contenu & E-E-A-T", weight: 20 },
  { key: "technical", icon: "🛠️", label: "Technique GEO", weight: 15 },
  { key: "schema", icon: "🧩", label: "Données structurées", weight: 10 },
  { key: "platform_optimization", icon: "📡", label: "Optimisation plateformes", weight: 10 },
];

function gauge(score, size = 120) {
  const r = size / 2 - 9, c = 2 * Math.PI * r, off = c * (1 - score / 100), col = colorFor(score);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#e7e5f5" stroke-width="9"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${size/2} ${size/2})"/>
    <text x="50%" y="48%" text-anchor="middle" dominant-baseline="middle" font-size="${size*0.27}" font-weight="800" fill="${DARK}">${score}</text>
    <text x="50%" y="64%" text-anchor="middle" font-size="${size*0.1}" fill="#999">/ 100</text>
    <text x="50%" y="86%" text-anchor="middle" font-size="${size*0.1}" font-weight="700" fill="${col}">${tierFor(score)}</text></svg>`;
}
const bar = (s) => `<div style="background:#ece9fb;border-radius:6px;height:10px;width:100%;overflow:hidden"><div style="width:${s}%;height:100%;background:${colorFor(s)};border-radius:6px"></div></div>`;
const LOGO = `<svg viewBox="0 0 420 110" width="230"><defs><linearGradient id="hdg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7F77DD"/><stop offset="100%" stop-color="#4B40C0"/></linearGradient></defs><polygon points="55,4 91,24 91,64 55,84 19,64 19,24" stroke="url(#hdg)" stroke-width="1.5" fill="none"/><polygon points="55,18 79,31 79,57 55,70 31,57 31,31" stroke="#534AB7" stroke-width="1" fill="none"/><path d="M38 44 A18 18 0 0 1 72 44" stroke="url(#hdg)" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M43 44 A13 13 0 0 1 67 44" stroke="#534AB7" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="55" cy="44" r="3.5" fill="#AFA9EC"/><circle cx="55" cy="44" r="1.5" fill="#EEEDFE"/><line x1="118" y1="15" x2="118" y2="75" stroke="#3C3489" stroke-width="0.5"/><text x="134" y="54" font-family="Arial,sans-serif" font-size="36" font-weight="800" fill="#EEEDFE" letter-spacing="-1">Digital<tspan fill="url(#hdg)">arc</tspan></text><text x="135" y="74" font-family="Arial,sans-serif" font-size="10.5" fill="#7F77DD" letter-spacing="0.26em">SEO · GEO · AEO · CRÉATION WEB</text></svg>`;

const frDate = () => new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const noteFor = (a, label) => (a.deep_dives || []).find((d) => d.category === label)?.notes || "";

function catSection(a, c, idx) {
  const score = a.scores?.[c.key] ?? 0;
  const note = (a.deep_dives || [])[idx]?.notes || noteFor(a, c.label) || "—";
  return `<div class="cat">
    <div class="cat-head"><div class="ct"><span class="ic">${c.icon}</span><div><h3>${c.label}</h3><span class="w">Pondération ${c.weight}%</span></div></div>${gauge(score, 88)}</div>
    <p class="note">${esc(note)}</p>
  </div>`;
}
function issuesSection(a) {
  const order = ["critique", "élevé", "moyen", "faible"];
  const titles = { critique: "🔴 Critiques", "élevé": "🟠 Élevés", moyen: "🟡 Moyens", faible: "🟢 Mineurs" };
  return order.map((sev) => {
    const list = (a.issues || []).filter((i) => i.severity === sev);
    if (!list.length) return "";
    return `<h3 style="margin:12px 0 6px;color:${DARK}">${titles[sev]}</h3>` + list.map((i) => `<div class="card"><h4>${esc(i.title)}</h4><div class="note" style="margin:2px 0 0">${esc(i.description)}<br><b style="color:${ACCENT}">Correctif :</b> ${esc(i.fix)}${i.pages ? ` · <i>${esc(i.pages)}</i>` : ""}</div></div>`).join("");
  }).join("");
}

export function renderAuditHtml(a, prospect = {}) {
  const date = frDate();
  const plats = a.platforms || [];
  const prio = (a.priorities || []).slice(0, 3);
  const plan = a.action_plan_30j || [];
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
  @page{size:A4;margin:0}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;font-family:'Segoe UI',Arial,sans-serif;color:#23222e;font-size:12px;line-height:1.5}
  .page{width:210mm;min-height:297mm;padding:17mm 15mm;position:relative;page-break-after:always}
  .page:last-child{page-break-after:auto}
  h1,h2,h3{margin:0;font-weight:800;letter-spacing:-.3px}
  .accent{color:${ACCENT}}
  .cover{background:${DARK};color:#EEEDFE;display:flex;flex-direction:column;justify-content:space-between}
  .cover .top{display:flex;justify-content:space-between;align-items:flex-start}
  .pill{background:${ACCENT};color:#fff;border-radius:10px;padding:8px 14px;text-align:center}
  .cover h1{font-size:38px;line-height:1.1;margin-top:50px}
  .cover .sub{color:#9b93e8;font-size:14px;letter-spacing:.16em;text-transform:uppercase;margin-top:8px}
  .cover .meta{color:#aaa3e0;margin-top:14px;font-size:12.5px}
  .scorewrap{display:flex;gap:26px;align-items:center;margin-top:26px;background:rgba(124,111,247,.12);border:1px solid rgba(124,111,247,.35);border-radius:16px;padding:22px 28px}
  .scorewrap .big{font-size:60px;font-weight:800;line-height:1}
  .twoscore{display:flex;gap:14px;margin-top:18px}
  .twoscore .b{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px 18px}
  .twoscore .n{font-size:30px;font-weight:800}
  .cover .foot{color:#777;font-size:10.5px}
  .band{background:${DARK};color:#EEEDFE;margin:-17mm -15mm 14px;padding:13px 15mm;display:flex;align-items:center;gap:12px}
  .band .sub{color:#9b93e8;font-size:10px;letter-spacing:.16em;text-transform:uppercase}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
  .minirow{display:flex;align-items:center;gap:10px;border:1px solid #eceaf6;border-radius:10px;padding:8px 12px}
  .minirow .nm{flex:1;font-weight:600}.minirow .sc{font-weight:800}
  .card{border-left:4px solid ${ACCENT};border:1px solid #eceaf6;border-radius:12px;padding:12px 14px;margin-bottom:8px}
  .card h4{margin:0 0 3px;font-size:13px}.card .tag{font-size:10px;color:${ACCENT};font-weight:700;text-transform:uppercase}
  .platrow{display:flex;align-items:center;gap:12px;padding:7px 0;border-bottom:1px solid #f0eef8}
  .platrow .pn{width:160px;font-weight:600}.platrow .pb{flex:1}.platrow .ps{width:54px;text-align:right;font-weight:800}.platrow .pg{flex:2;font-size:10px;color:#6c697e}
  .cat{margin-bottom:14px;border-bottom:1px solid #f0eef8;padding-bottom:10px}
  .cat-head{display:flex;justify-content:space-between;align-items:center}
  .ct{display:flex;gap:10px;align-items:center}.ct .ic{font-size:22px}.ct h3{font-size:15px}.ct .w{font-size:10px;color:#8a86a0}
  .note{color:#46435a;margin:8px 0}
  ul.iss{margin:6px 0 0;padding-left:16px;font-size:11px}ul.iss li{margin-bottom:3px}
  .planweek{margin-bottom:12px}.planweek h3{color:${ACCENT};font-size:13px;margin-bottom:5px}.planweek ul{margin:0;padding-left:18px}.planweek li{margin-bottom:3px}
  .cta{background:${DARK};color:#EEEDFE;border-radius:14px;padding:18px 22px;text-align:center;margin-top:14px}.cta a{color:#fff}
  .pagenum{position:absolute;bottom:8mm;right:15mm;font-size:10px;color:#9a97ad}.fb{position:absolute;bottom:8mm;left:15mm;font-size:10px;color:#9a97ad}
  </style></head><body>

  <div class="page cover">
    <div class="top">${LOGO}<div class="pill"><div style="font-size:10px;letter-spacing:.1em">VISIBILITÉ IA</div><div style="font-size:30px;font-weight:800;line-height:1">${a.score_ia}<span style="font-size:15px">/100</span></div></div></div>
    <div>
      <h1>Audit de visibilité<br><span class="accent">SEO · GEO · AEO</span></h1>
      <div class="sub">Référencement Google &amp; moteurs IA</div>
      <div class="meta">Site : <b>${esc(a.url)}</b> · ${esc(a.business_type || "")} · ${date} · Analyse externe</div>
      <div class="scorewrap"><div>${gauge(a.score_global, 120).replace('fill="#0d0f1f"','fill="#fff"').replace('fill="#999"','fill="#bbb"')}</div>
        <div><div style="font-size:12px;color:#aaa3e0;letter-spacing:.1em">SCORE GLOBAL</div><div class="big">${a.score_global}<span style="font-size:22px">/100</span></div><div style="color:${colorFor(a.score_global)};font-weight:700">${tierFor(a.score_global)}</div></div></div>
      <div class="twoscore"><div class="b"><div class="n">${a.score_seo}<span style="font-size:14px">/100</span></div><div style="color:#9b93e8">Score SEO (Google)</div></div><div class="b"><div class="n">${a.score_ia}<span style="font-size:14px">/100</span></div><div style="color:#9b93e8">Score visibilité IA</div></div></div>
    </div>
    <div class="foot">Rapport établi par Digitalarc — digitalarc.fr · ${esc(prospect.email || "")}</div>
  </div>

  <div class="page">
    <div class="band"><div><div class="sub">Synthèse</div><h2>Résumé exécutif</h2></div></div>
    <p class="note">${esc(a.executive_summary)}</p>
    <div class="grid">${CATS.map((c) => `<div class="minirow"><span style="font-size:18px">${c.icon}</span><span class="nm">${c.label}<div style="margin-top:4px">${bar(a.scores?.[c.key] ?? 0)}</div></span><span class="sc" style="color:${colorFor(a.scores?.[c.key] ?? 0)}">${a.scores?.[c.key] ?? 0}</span></div>`).join("")}</div>
    <h3 style="margin:12px 0 8px;color:${DARK}">🎯 Vos priorités à fort impact</h3>
    ${prio.map((p, i) => `<div class="card"><span class="tag">Priorité ${i + 1}</span><h4>${esc(p.action)}</h4><div class="note" style="margin:2px 0 0">${esc(p.impact)}</div></div>`).join("")}
    <div class="fb">Digitalarc · Audit SEO·GEO·AEO</div><div class="pagenum">2</div>
  </div>

  <div class="page">
    <div class="band"><span style="font-size:20px">🤖</span><div><div class="sub">Generative Engine Optimization</div><h2>Visibilité dans les IA : <span class="accent">${a.score_ia}/100</span></h2></div></div>
    <p class="note">Capacité du site à être découvert, compris et cité par ChatGPT, Perplexity, Gemini, Google AI Overviews et Bing Copilot.</p>
    ${plats.map((p) => `<div class="platrow"><span class="pn">${esc(p.name)}</span><span class="pb">${bar(p.score)}</span><span class="ps" style="color:${colorFor(p.score)}">${p.score}/100</span><span class="pg">${esc(p.gap)}</span></div>`).join("")}
    <div class="fb">Digitalarc · Audit SEO·GEO·AEO</div><div class="pagenum">3</div>
  </div>

  <div class="page">
    <div class="band"><span style="font-size:20px">📊</span><div><div class="sub">Analyse détaillée par catégorie</div><h2>Détail des scores</h2></div></div>
    ${CATS.map((c, i) => catSection(a, c, i)).join("")}
    <div class="fb">Digitalarc · Audit SEO·GEO·AEO</div><div class="pagenum">4</div>
  </div>

  <div class="page">
    <div class="band"><span style="font-size:20px">🔍</span><div><div class="sub">Constats priorisés</div><h2>Problèmes détectés</h2></div></div>
    ${issuesSection(a)}
    <div class="fb">Digitalarc · Audit SEO·GEO·AEO</div><div class="pagenum">5</div>
  </div>

  <div class="page">
    <div class="band"><span style="font-size:20px">🗺️</span><div><div class="sub">Feuille de route priorisée</div><h2>Plan d'action 30 jours</h2></div></div>
    ${plan.map((w) => `<div class="planweek"><h3>Semaine ${w.week} — ${esc(w.theme)}</h3><ul>${(w.items || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("")}
    <div class="cta"><div style="font-size:15px;font-weight:800">Prêt à devenir visible sur Google ET dans les IA ?</div><p style="color:#cfc9f5;margin:8px 0 0">${esc(a.recommendation)}</p><p style="margin-top:10px"><b>Digitalarc</b> — <a href="https://digitalarc.fr">digitalarc.fr</a> · contact@digitalarc.fr</p></div>
    <p style="margin-top:12px;font-size:10px;color:#9a97ad"><b>Méthodologie :</b> analyse externe (sans accès au site) le ${date}. Barème pondéré : Citabilité IA 25% · Autorité de marque 20% · Contenu &amp; E-E-A-T 20% · Technique 15% · Données structurées 10% · Optimisation plateformes 10%.</p>
    <div class="fb">Digitalarc · Audit SEO·GEO·AEO</div><div class="pagenum">6</div>
  </div>
  </body></html>`;
}
