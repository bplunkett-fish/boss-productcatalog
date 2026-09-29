import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// Called from the sign-up screen, which runs BEFORE anyone is signed in, so this
// endpoint deliberately does not require a logged-in user — that is the whole
// point of it. It takes just an email address and answers with one yes/no about
// that address alone: invitation details are never disclosed and the invitation
// list is read server-side, never returned. The service role is used solely to
// read the admin-managed registration setting.
//
// The invitation answer FAILS CLOSED: if the list cannot be read (missing or
// expired token, network failure) nobody is admitted and the caller is told the
// check could not be completed. Repeated probing from one caller is throttled so
// the yes/no cannot be used to enumerate invited addresses at scale.

const PROBE_MAX = 8;            // email checks allowed per caller ...
const PROBE_WINDOW_MS = 60000;  // ... per minute

// Best-effort, per-instance counters — enough to blunt scripted enumeration.
const probes = new Map();

function underProbeLimit(caller) {
  const now = Date.now();
  if (probes.size > 2000) {
    for (const [key, entry] of probes) {
      if (now - entry.start > PROBE_WINDOW_MS) probes.delete(key);
    }
  }
  const entry = probes.get(caller);
  if (!entry || now - entry.start > PROBE_WINDOW_MS) {
    probes.set(caller, { count: 1, start: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= PROBE_MAX;
}

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

    // Throttle the address checks, which are the only part of this response that
    // says anything about someone else's account.
    const caller =
      req.headers.get("cf-connecting-ip") ||
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      "unknown";
    if (!underProbeLimit(caller)) {
      return Response.json({ registration_enabled: false, allowed: false, verified: false });
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
      // admitted. `verified: false` lets the sign-up screen say the check is
      // temporarily unavailable instead of implying the address was not invited.
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