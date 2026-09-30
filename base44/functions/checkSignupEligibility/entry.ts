import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// Abuse control for the invitation answer (see the note above the handler).
const CHECK_WINDOW_MS = 10 * 60 * 1000;
const MAX_CHECKS_PER_IP = 20;

// Called from the sign-up screen, which runs BEFORE anyone is signed in, so this
// endpoint deliberately does NOT require a logged-in user — an auth check would
// make the sign-up screen unusable. It takes just an email address and answers
// with one yes/no about that address alone: invitation details are never
// disclosed and the invitation list is read server-side, never returned. The
// service role is used solely for the admin-managed registration setting.
//
// Because it must stay open, the caller is limited instead of authenticated:
// answers for a given address are handed out at most MAX_CHECKS_PER_IP times per
// CHECK_WINDOW_MS from one address, so the list cannot be walked in bulk. Over
// that limit the answer is "unavailable", which fails closed — an attacker
// learns nothing, and a real sign-up simply retries later.
//
// The invitation answer FAILS CLOSED: if the list cannot be read (missing or
// expired token, network failure) nobody is admitted, and `verified: false` tells
// the sign-up screen to say the check is unavailable rather than implying the
// address was not invited.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const payload = body && typeof body === "object" && body.payload ? body.payload : body;
    const email = String(payload?.email || "").trim().toLowerCase();

    const settings = await base44.asServiceRole.entities.AppSetting.list();
    const registrationEnabled =
      settings.length === 0 ? true : settings[0].registration_enabled !== false;

    if (registrationEnabled) {
      return Response.json({ registration_enabled: true, allowed: true, verified: true });
    }

    if (!email) {
      return Response.json({ registration_enabled: false, allowed: false, verified: true });
    }

    // Rate limit before the invitation list is consulted, so the check cannot be
    // used as a bulk lookup tool. Only the recent window is counted; the oldest
    // record is dropped once the window is full, which keeps the table bounded.
    const ip =
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    const attempts = await base44.asServiceRole.entities.SignupCheckAttempt.filter(
      { ip },
      "-created_date",
      MAX_CHECKS_PER_IP
    );
    const oldest = attempts[attempts.length - 1];
    if (
      attempts.length >= MAX_CHECKS_PER_IP &&
      oldest &&
      Date.now() - new Date(oldest.created_date).getTime() < CHECK_WINDOW_MS
    ) {
      return Response.json({ registration_enabled: false, allowed: false, verified: false });
    }
    await base44.asServiceRole.entities.SignupCheckAttempt.create({ ip });
    if (attempts.length >= MAX_CHECKS_PER_IP && oldest) {
      await base44.asServiceRole.entities.SignupCheckAttempt
        .delete(oldest.id)
        .catch(() => {});
    }

    // Signups are closed, so only people an admin has invited may continue.
    // The platform keeps that list, which covers invitations sent from the app
    // dashboard and from inside the app alike.
    let invited = false;
    let verified = false;
    try {
      const res = await fetch(
        `https://app.base44.com/api/apps/${secrets.get("BASE44_APP_ID")}/access-requests/all`,
        { headers: { Authorization: `Bearer ${secrets.get("BASE44_PERSONAL_ACCESS_TOKEN")}` } }
      );
      if (res.ok) {
        const entries = await res.json();
        verified = true;
        invited =
          Array.isArray(entries) &&
          entries.some(
            (entry) =>
              String(entry?.email || "").toLowerCase() === email && entry?.status === "approved"
          );
      }
    } catch {
      // Token or network problem: the check could not be completed, so nobody is
      // admitted — never let an unreadable list stand in for an approved invite.
    }

    return Response.json({
      registration_enabled: false,
      allowed: invited,
      verified,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}