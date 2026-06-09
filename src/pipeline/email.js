// ============================================================
// Étape 4 du pipeline : envoi de l'audit par email
// ------------------------------------------------------------
// Priorité à RESEND (API HTTPS) — indispensable sur Render/PaaS qui bloquent
// le SMTP sortant. Repli sur SMTP (nodemailer) si pas de clé Resend (local).
//
// - Toujours : notifie Joachim (NOTIFY_EMAIL) avec l'audit complet.
// - Au prospect : SEULEMENT si LIVE && SEND_TO_PROSPECT (double garde-fou).
// Non-LIVE -> aucun envoi.
// ============================================================
import nodemailer from "nodemailer";
import { env, LIVE, SEND_TO_PROSPECT } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { renderHtmlEmail, renderMarkdown } from "../audit-spec.js";

// Envoie un email via Resend (HTTPS) ou SMTP selon la config.
async function deliver({ to, replyTo, subject, html, text, attachments = [] }) {
  if (env.resendKey) {
    const body = { from: env.resendFrom, to: [to], reply_to: replyTo, subject, html, text };
    if (attachments.length) body.attachments = attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") }));
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendKey}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return "Resend";
  }
  // Repli SMTP (usage local — bloqué sur Render)
  const t = nodemailer.createTransport({
    host: env.smtpHost, port: env.smtpPort, secure: env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
  await t.sendMail({ from: `"${env.senderName}" <${env.smtpUser}>`, to, replyTo, subject, html, text, attachments });
  return "SMTP";
}

export async function sendAudit(prospect, audit, pdf = null) {
  const html = renderHtmlEmail(audit, prospect);
  const text = renderMarkdown(audit);
  const subjectProspect = `Votre audit gratuit SEO·GEO·AEO — ${audit.url} (${audit.score_global}/100)`;
  const subjectNotify = `[AUDIT] ${audit.url} — global ${audit.score_global} / SEO ${audit.score_seo} / IA ${audit.score_ia} — ${prospect.email || "?"}`;
  // PDF d'audit en pièce jointe (si généré)
  const slug = String(audit.brand_name || audit.url || "site").toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
  const attachments = pdf ? [{ filename: `audit-${slug}.pdf`, content: pdf }] : [];

  if (!LIVE) {
    log.warn(`[DRY] email NON envoyé. Prospect=${prospect.email} | Notify=${env.notifyEmail}`);
    return { sentToProspect: false, sentToJoachim: false, dry: true };
  }

  const via = env.resendKey ? "Resend" : "SMTP";
  const result = { sentToProspect: false, sentToJoachim: false, via };

  // 1) Notification interne (toujours) — pour relecture
  try {
    await deliver({ to: env.notifyEmail, replyTo: env.replyTo, subject: subjectNotify, html, text, attachments });
    result.sentToJoachim = true;
    log.ok(`Audit notifié à ${env.notifyEmail} (via ${via})`);
  } catch (e) {
    log.error(`Échec notification interne (${via}) : ${e.message}`);
  }

  // 2) Envoi au prospect (double condition)
  if (SEND_TO_PROSPECT && prospect.email) {
    try {
      await deliver({ to: prospect.email, replyTo: env.replyTo, subject: subjectProspect, html, text, attachments });
      result.sentToProspect = true;
      log.ok(`Audit envoyé au prospect ${prospect.email} (via ${via})`);
    } catch (e) {
      log.error(`Échec envoi prospect (${via}) : ${e.message}`);
    }
  } else {
    log.warn(`Envoi prospect désactivé (SEND_TO_PROSPECT=${SEND_TO_PROSPECT}). Audit gardé pour relecture.`);
  }
  return result;
}
