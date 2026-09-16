import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isOptedIn } from "../../shared/notifications.ts";

// Processes admin-scheduled push notifications whose send time has arrived.
// Invoked every few minutes by the "Scheduled Notifications" workflow, and
// also on demand when an admin sends a notification immediately. For each
// due notification, pushes to every user who opted into its category, then
// marks it sent. Runs with the service role (no end user); direct calls by a
// signed-in non-admin are rejected.
const APP_URL = "https://hypersonic-sync-your-gear.base44.app";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch { user = null; }
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const now = new Date();
    const pending = await svc.entities.ScheduledNotification.filter({ status: "pending" }, "-created_date", 200);
    const due = pending.filter(n => n.send_at && new Date(n.send_at) <= now);
    if (due.length === 0) return Response.json({ ok: true, processed: 0 });

    const users = await svc.entities.User.list("-created_date", 1000);

    let processed = 0;
    for (const n of due) {
      let sent = 0;
      for (const u of users) {
        if (!isOptedIn(u, n.category)) continue;
        try {
          await svc.integrations.Core.SendPushNotification({
            user_id: u.id,
            title: n.title,
            content: n.content,
            action_label: "Open app",
            action_url: APP_URL
          });
          sent++;
        } catch (e) {
          // Push may fail if no native mobile build / push credentials are
          // configured — continue to the next user.
        }
      }
      try {
        await svc.entities.ScheduledNotification.update(n.id, { status: "sent", sent_count: sent });
        processed++;
      } catch (e) {
        // If the status update fails, leave it pending so it retries next run.
      }
    }

    return Response.json({ ok: true, processed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}