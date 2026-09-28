import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Called from the sign-up screen, which runs BEFORE anyone is signed in, so this
// endpoint deliberately does not require a logged-in user — that is the whole
// point of it. To keep it safe it returns booleans only (never the invite list
// or any other record), accepts just an email address, and uses the service role
// solely to read the two admin-managed setting records.
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
      return Response.json({ registration_enabled: true, allowed: true, invited: false });
    }

    if (!email) {
      return Response.json({ registration_enabled: false, allowed: false, invited: false });
    }

    const invites = await base44.asServiceRole.entities.RegistrationInvite.filter({ email });
    const invited = invites.length > 0;

    return Response.json({ registration_enabled: false, allowed: invited, invited });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}