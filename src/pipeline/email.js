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

  // Email PROSPECT : intro COURTE + PDF en pièce jointe (pas l'audit en double).
  // Repli : si le PDF n'a pas pu être généré, on remet l'audit HTML complet pour ne pas envoyer un email vide.
  const introHtml = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;color:#23222e;font-size:15px;line-height:1.6">
  <div style="background:#0d0f1f;padding:22px 26px;border-radius:14px 14px 0 0">
    <span style="color:#EEEDFE;font-size:20px;font-weight:800">Digital<span style="color:#7c6ff7">arc</span></span>
    <div style="color:#7c6ff7;font-size:10px;letter-spacing:.22em;margin-top:3px">SEO · GEO · AEO · CRÉATION WEB</div>
  </div>
  <div style="border:1px solid #eceaf6;border-top:none;border-radius:0 0 14px 14px;padding:24px 26px">
    <p>Bonjour,</p>
    <p>Merci d'avoir demandé votre <strong>audit gratuit de visibilité SEO · GEO · AEO</strong> pour <strong>${audit.url}</strong>.</p>
    <p>Votre <strong>rapport complet est en pièce jointe (PDF)</strong> : score global, score de visibilité dans les IA (ChatGPT, Perplexity, Gemini…), analyse détaillée par catégorie et vos priorités d'action.</p>
    <p style="background:#f4f2fd;border-left:3px solid #7c6ff7;padding:11px 14px;border-radius:6px;margin:16px 0">📄 <strong>Votre audit complet</strong> — à ouvrir en pièce jointe.</p>
    <p>Une question ou envie d'aller plus loin ? Répondez simplement à cet email.</p>
    <p style="margin-top:18px">Joachim — <strong>Digitalarc</strong><br><span style="color:#6c697e">contact@digitalarc.fr · digitalarc.fr</span></p>
  </div>
</div>`;
  const introText = `Bonjour,\n\nMerci d'avoir demandé votre audit gratuit de visibilité SEO · GEO · AEO pour ${audit.url}.\n\nVotre rapport complet est en pièce jointe (PDF) : score global, score de visibilité dans les IA, analyse par catégorie et vos priorités d'action.\n\nUne question ? Répondez simplement à cet email.\n\nJoachim — Digitalarc\ncontact@digitalarc.fr · digitalarc.fr`;
  const prospectHtml = pdf ? introHtml : html;
  const prospectText = pdf ? introText : text;

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
      await deliver({ to: prospect.email, replyTo: env.replyTo, subject: subjectProspect, html: prospectHtml, text: prospectText, attachments });
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
