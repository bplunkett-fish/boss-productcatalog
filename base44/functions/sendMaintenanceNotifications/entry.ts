import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isOptedIn } from "../../shared/notifications.ts";

// Daily maintenance reminder job (invoked by the "Maintenance Reminders"
// workflow). For every catalog item whose maintenance is due within 7 days
// (or already overdue), sends a push notification to the owner — repeating
// daily until they silence reminders or update the maintenance date.
//
// Runs with the service role (no end user), so it can read all catalog items
// and push to any owner. Direct calls by a signed-in non-admin are rejected.
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
    const items = await svc.entities.CatalogItem.list("-created_date", 1000);
    const products = await svc.entities.Product.list("-updated_date", 1000);
    const productMap = {};
    for (const p of products) productMap[p.model_number] = p;
    const users = await svc.entities.User.list("-created_date", 1000);
    const userMap = {};
    for (const u of users) userMap[u.id] = u;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    let sent = 0;
    let skipped = 0;

    for (const item of items) {
      if (!item.maintenance_due_date || item.maintenance_silenced) { skipped++; continue; }
      const due = new Date(item.maintenance_due_date + "T00:00:00");
      const diffDays = Math.round((due - today) / 86400000);
      if (diffDays > 7) { skipped++; continue; }
      if (!isOptedIn(userMap[item.created_by_id], "Product Maintenance")) { skipped++; continue; }

      const product = productMap[item.model_number];
      const name = product?.product_name || item.model_number || "your equipment";
      const dueStr = item.maintenance_due_date;
      const lastStr = item.last_maintenance_date || "—";
      const content = diffDays <= 0
        ? `Maintenance is overdue for ${name} (was due ${dueStr}). Last serviced ${lastStr}. Update the date or silence reminders.`
        : `Maintenance for ${name} is due in ${diffDays} day${diffDays === 1 ? "" : "s"} (${dueStr}). Last serviced ${lastStr}.`;

      try {
        await svc.integrations.Core.SendPushNotification({
          user_id: item.created_by_id,
          title: "Maintenance reminder",
          content,
          action_label: "View details",
          action_url: `${APP_URL}/product/${item.id}`
        });
        sent++;
      } catch (e) {
        // Push may fail if no native mobile build / push credentials are
        // configured — continue to the next item.
      }
    }

    return Response.json({ ok: true, sent, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}