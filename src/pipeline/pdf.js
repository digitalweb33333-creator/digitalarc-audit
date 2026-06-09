// ============================================================
// Génération PDF (A4) depuis le HTML d'audit.
// - Render / Linux : @sparticuz/chromium + puppeteer-core (autonome).
// - Local Windows  : Edge installé (pour tester le template).
// Résilient : renvoie null si échec (l'email part alors sans PDF).
// ============================================================
import puppeteer from "puppeteer-core";
import { log } from "../lib/logger.js";

const WIN_EDGE = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

async function launch() {
  if (process.platform === "win32") {
    const fs = await import("node:fs");
    const exe = WIN_EDGE.find((p) => fs.existsSync(p));
    if (!exe) throw new Error("Edge introuvable (test local PDF)");
    return puppeteer.launch({ executablePath: exe, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
  }
  // Linux / Render
  const chromium = (await import("@sparticuz/chromium")).default;
  return puppeteer.launch({
    args: [...chromium.args, "--no-sandbox", "--disable-dev-shm-usage"],
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
}

// Renvoie un Buffer PDF, ou null en cas d'échec.
export async function htmlToPdf(html) {
  let browser;
  try {
    browser = await launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 45000 });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    return Buffer.from(pdf);
  } catch (e) {
    log.error(`Génération PDF échouée : ${e.message} (l'email partira sans PDF)`);
    return null;
  } finally {
    try { if (browser) await browser.close(); } catch {}
  }
}
