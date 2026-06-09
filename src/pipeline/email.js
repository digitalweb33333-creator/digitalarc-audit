// ============================================================
// Étape 4 du pipeline : envoi de l'audit par email (SMTP Hostinger)
// ------------------------------------------------------------
// - Toujours : notifie Joachim (NOTIFY_EMAIL) avec l'audit complet.
// - Au prospect : SEULEMENT si LIVE && SEND_TO_PROSPECT (double garde-fou).
// En mode non-LIVE : aucun envoi, on logue ce qui partirait.
// ============================================================
import nodemailer from "nodemailer";
import { env, LIVE, SEND_TO_PROSPECT } from "../lib/config.js";
import { log } from "../lib/logger.js";
import { renderHtmlEmail, renderMarkdown } from "../audit-spec.js";

function transport() {
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
}

export async function sendAudit(prospect, audit) {
  const html = renderHtmlEmail(audit, prospect);
  const text = renderMarkdown(audit);
  const subjectProspect = `Votre mini-audit gratuit — ${audit.url} (${audit.score_global}/100)`;
  const subjectNotify = `[AUDIT] ${audit.url} — global ${audit.score_global} / SEO ${audit.score_seo} / IA ${audit.score_ia} — ${prospect.email || "?"}`;

  if (!LIVE) {
    log.warn(`[DRY] email NON envoyé. Prospect=${prospect.email} | Notify=${env.notifyEmail}`);
    log.info(`[DRY] sujet prospect : "${subjectProspect}"`);
    return { sentToProspect: false, sentToJoachim: false, dry: true };
  }

  const t = transport();
  const from = `"${env.senderName}" <${env.smtpUser}>`;
  const result = { sentToProspect: false, sentToJoachim: false };

  // 1) Notification interne (toujours) — pour relecture avant diffusion large
  try {
    await t.sendMail({
      from, to: env.notifyEmail, replyTo: env.replyTo,
      subject: subjectNotify, html, text,
    });
    result.sentToJoachim = true;
    log.ok(`Audit notifié à ${env.notifyEmail}`);
  } catch (e) {
    log.error(`Échec notification interne : ${e.message}`);
  }

  // 2) Envoi au prospect (double condition)
  if (SEND_TO_PROSPECT && prospect.email) {
    try {
      await t.sendMail({
        from, to: prospect.email, replyTo: env.replyTo,
        subject: subjectProspect, html, text,
      });
      result.sentToProspect = true;
      log.ok(`Audit envoyé au prospect ${prospect.email}`);
    } catch (e) {
      log.error(`Échec envoi prospect : ${e.message}`);
    }
  } else {
    log.warn(`Envoi prospect désactivé (SEND_TO_PROSPECT=${SEND_TO_PROSPECT}). Audit gardé pour relecture.`);
  }
  return result;
}

// Test de connexion SMTP (utilitaire)
export async function verifySmtp() {
  if (!env.smtpUser || !env.smtpPass) return { ok: false, error: "SMTP non configuré" };
  try {
    await transport().verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
