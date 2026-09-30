import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// Abuse control for the invitation answer (see the note above the handler).
const CHECK_WINDOW_MS = 10 * 60 * 1000;
const MAX_CHECKS_PER_CALLER = 20;
// Ceiling across all callers together, so the answer cannot be walked in bulk
// even if the caller address is rotated or missing entirely.
const MAX_CHECKS_TOTAL = 60;
// Marker records are bookkeeping for the window above; the table is capped so it
// cannot grow without bound.
const MAX_MARKER_RECORDS = 200;

// The address the caller really connected from, as reported by the platform's
// edge. Anything the caller can supply itself is ignored: the leftmost
// X-Forwarded-For hop is caller-controlled, so trusting it would let one caller
// spread its requests across unlimited rate-limit buckets.
function callerAddress(req) {
  const header = (name) => (req.headers.get(name) || "").trim();
  const reported = header("cf-connecting-ip") || header("x-real-ip");
  if (reported) return reported;
  // No edge-reported field: fall back to the hop the last proxy appended, which
  // is the one hop a caller cannot forge.
  const hops = header("x-forwarded-for")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  return hops.length > 0 ? hops[hops.length - 1] : "unknown";
}

// Called from the sign-up screen, which runs BEFORE anyone is signed in, so this
// endpoint deliberately does NOT require a logged-in user — an auth check would
// make the sign-up screen unusable. It takes just an email address and answers
// with one yes/no about that address alone: invitation details are never
// disclosed and the invitation list is read server-side, never returned. The
// service role is used solely for the admin-managed registration setting.
//
// Because it must stay open, the caller is limited instead of authenticated. The
// limit is counted against the address the platform's edge reports for the
// connection — never a value the caller can prepend itself — and a second
// ceiling counts every caller together, so neither rotating a header nor a
// missing one unlocks bulk lookups. Over either limit the answer is
// "unavailable", which fails closed — an attacker learns nothing, and a real
// sign-up simply retries later.
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
    // used as a bulk lookup tool. Only the recent window is counted.
    const caller = callerAddress(req);
    const markers = await base44.asServiceRole.entities.SignupCheckAttempt.list(
      "-created_date",
      MAX_MARKER_RECORDS
    );
    const now = Date.now();
    const inWindow = markers.filter(
      (marker) => now - new Date(marker.created_date).getTime() < CHECK_WINDOW_MS
    );
    const fromCaller = inWindow.filter((marker) => marker.ip === caller).length;
    if (inWindow.length >= MAX_CHECKS_TOTAL || fromCaller >= MAX_CHECKS_PER_CALLER) {
      return Response.json({ registration_enabled: false, allowed: false, verified: false });
    }
    await base44.asServiceRole.entities.SignupCheckAttempt.create({ ip: caller });
    if (markers.length >= MAX_MARKER_RECORDS) {
      const oldest = markers[markers.length - 1];
      if (oldest) {
        await base44.asServiceRole.entities.SignupCheckAttempt
          .delete(oldest.id)
          .catch(() => {});
      }
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