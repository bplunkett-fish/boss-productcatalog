import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isOptedIn } from "../../shared/notifications.ts";

// Processes admin-scheduled push notifications whose send time has arrived.
// Invoked every few minutes by the "Scheduled Notifications" workflow, and
// also on demand when an admin sends a notification immediately. For each
// due notification it delivers an in-app alert (AppNotification) to every
// opted-in user and attempts a native push for mobile. Runs with the service
// role (no end user); direct calls by a signed-in non-admin are rejected.
const APP_URL = "https://hypersonic-sync-your-gear.base44.app";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch { user = null; }
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
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
      // Idempotent: skip users who already have an in-app alert for this
      // scheduled notification (protects against re-runs if the status
      // update below fails).
      const existing = await svc.entities.AppNotification.filter({ ref_id: n.id }, "-created_date", 1000);
      const alreadyNotified = new Set(existing.map((e) => e.user_id));

      let delivered = 0;
      for (const u of users) {
        if (!isOptedIn(u, n.category)) continue;
        if (alreadyNotified.has(u.id)) continue;

        try {
          await svc.entities.AppNotification.create({
            user_id: u.id,
            title: n.title,
            content: n.content,
            category: n.category,
            ref_id: n.id,
            read: false,
            action_url: APP_URL
          });
          delivered++;
        } catch (e) {
          continue; // don't push if the in-app alert didn't persist
        }

        try {
          await svc.integrations.Core.SendPushNotification({
            user_id: u.id,
            title: n.title,
            content: n.content,
            action_label: "Open app",
            action_url: APP_URL
          });
        } catch (e) {
          // Push may fail if no native mobile build / push credentials are
          // configured — the in-app alert still reached the user.
        }
      }

      try {
        await svc.entities.ScheduledNotification.update(n.id, { status: "sent", sent_count: delivered });
        processed++;
      } catch (e) {
        // Leave pending so it retries next run; idempotency above prevents
        // duplicate deliveries.
      }
    }

    return Response.json({ ok: true, processed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}