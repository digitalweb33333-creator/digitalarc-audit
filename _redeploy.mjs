// Redéploiement : commit+push -> set env Resend sur Render -> deploy -> poll.
import "dotenv/config";
import { execFileSync } from "node:child_process";

const GH = process.env.GH_TOKEN, RENDER = process.env.RENDER_KEY;
const RESEND = process.env.RESEND_API_KEY, RESEND_FROM = process.env.RESEND_FROM;
const REPO = "digitalarc-audit", SVC = "srv-d8k32tflk1mc73e5pbe0", USER = "digitalweb33333-creator";
const rdH = { Authorization: `Bearer ${RENDER}`, "Content-Type": "application/json", Accept: "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function rd(m, p, b) {
  const r = await fetch("https://api.render.com/v1" + p, { method: m, headers: rdH, body: b ? JSON.stringify(b) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t }; }
  return { ok: r.ok, status: r.status, j, t };
}

// 1) commit + push
console.log("Commit + push...");
const cmd = `cd ~/digitalarc-audit && git add -A && git -c user.email=a@b.c -c user.name=Digitalarc commit -q -m "email Resend + auto-detection URL" ; git push https://${USER}:${GH}@github.com/${USER}/${REPO}.git HEAD:main 2>&1 | tail -4`;
console.log(execFileSync("wsl", ["bash", "-lc", cmd], { encoding: "utf8" }).trim());

// 2) env vars Resend (single-key upsert ; fallback liste complète)
for (const [k, v] of [["RESEND_API_KEY", RESEND], ["RESEND_FROM", RESEND_FROM]]) {
  let r = await rd("PUT", `/services/${SVC}/env-vars/${k}`, { value: v });
  if (!r.ok) {
    // fallback : remplacer toute la liste
    const cur = await rd("GET", `/services/${SVC}/env-vars?limit=100`);
    const arr = (cur.j || []).map((e) => e.envVar || e).filter((e) => e && e.key && e.value != null).map((e) => ({ key: e.key, value: e.value }));
    const upsert = (key, val) => { const f = arr.find((x) => x.key === key); if (f) f.value = val; else arr.push({ key, value: val }); };
    upsert("RESEND_API_KEY", RESEND); upsert("RESEND_FROM", RESEND_FROM);
    r = await rd("PUT", `/services/${SVC}/env-vars`, arr);
    console.log(`env (fallback liste) ${k}: HTTP ${r.status} ${r.ok ? "OK" : r.t.slice(0, 150)}`);
    break;
  }
  console.log(`env ${k}: HTTP ${r.status} OK`);
}

// 3) deploy
const dep = await rd("POST", `/services/${SVC}/deploys`, { clearCache: "do_not_clear" });
console.log("deploy:", dep.status, dep.ok ? (dep.j.id || "") : dep.t.slice(0, 150));

// 4) poll
let status = "?";
for (let i = 0; i < 30; i++) {
  await sleep(15000);
  const dl = await rd("GET", `/services/${SVC}/deploys?limit=1`);
  const d = dl.ok ? (dl.j[0]?.deploy || dl.j[0]) : null;
  status = d?.status || "?";
  console.log(`  [${String(i).padStart(2)}] ${status}`);
  if (["live", "build_failed", "update_failed", "canceled", "deactivated"].includes(status)) break;
}
console.log("STATUT FINAL:", status);
const h = await fetch("https://digitalarc-audit.onrender.com/health").then((r) => r.text()).catch((e) => "err " + e.message);
console.log("health:", h);
