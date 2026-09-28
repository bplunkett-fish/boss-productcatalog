import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { getAppBaseUrl } from "../../shared/appUrl.ts";

// Diagnostic endpoint for push delivery. It sends a single push notification to
// the account that calls it and hands back the notification service's answer
// verbatim, so a delivery problem shows up as text instead of failing silently.
// The caller cannot choose a target: the notification always goes to the
// signed-in admin's own account.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const actionUrl = await getAppBaseUrl(base44.asServiceRole);

    const response = await base44.asServiceRole.integrations.Core.SendPushNotification({
      user_id: user.id,
      title: 'Test notification',
      content: 'Test push from ProductSync Pro. If you can see this, push notifications are reaching your device.',
      action_label: 'Open app',
      action_url: actionUrl
    });

    return Response.json({
      ok: true,
      sent_to: user.email,
      user_id: user.id,
      response: response ?? null
    });
  } catch (error) {
    // The error text is the answer the tester wants to read, so it is returned
    // as the response body rather than as a bare failure.
    return Response.json({ ok: false, error: String(error?.message || error) });
  }
}