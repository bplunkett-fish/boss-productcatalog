import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// Called from the sign-up screen, which runs BEFORE anyone is signed in, so this
// endpoint deliberately does not require a logged-in user — that is the whole
// point of it. It takes just an email address and answers with one yes/no about
// that address alone: invitation details are never disclosed and the invitation
// list is read server-side, never returned. The service role is used solely to
// read the admin-managed registration setting.
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
      return Response.json({ registration_enabled: true, allowed: true });
    }

    if (!email) {
      return Response.json({ registration_enabled: false, allowed: false });
    }

    // Signups are closed, so only people an admin has invited may continue.
    // The platform keeps that list, which covers invitations sent from the app
    // dashboard and from inside the app alike.
    let invited = false;
    let listReadable = false;
    try {
      const res = await fetch(
        `https://app.base44.com/api/apps/${secrets.get("BASE44_APP_ID")}/access-requests/all`,
        { headers: { Authorization: `Bearer ${secrets.get("BASE44_PERSONAL_ACCESS_TOKEN")}` } }
      );
      if (res.ok) {
        const entries = await res.json();
        listReadable = true;
        invited =
          Array.isArray(entries) &&
          entries.some(
            (entry) =>
              String(entry?.email || "").toLowerCase() === email && entry?.status === "approved"
          );
      }
    } catch {
      // Token or network problem: fall through and let the person in rather than
      // locking out someone who was invited.
    }

    return Response.json({
      registration_enabled: false,
      allowed: invited || !listReadable,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}