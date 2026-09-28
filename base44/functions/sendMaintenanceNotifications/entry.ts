import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isOptedIn } from "../../shared/notifications.ts";

// Maintenance reminder job (invoked hourly by the "Maintenance Reminders"
// workflow). For every catalog item whose maintenance is due within 7 days
// (or already overdue), it alerts the owner around 9am in their local time:
// an in-app alert (AppNotification) plus a native push. Each item's push is
// sent at most once every 24 hours. Priority follows the time remaining:
// "normal" while the due date is still ahead, "critical" on the due day or
// once it is overdue.
//
// Runs with the service role (no end user), so it can read all catalog items
// and push to any owner. Direct calls by a signed-in non-admin are rejected.
const APP_URL = "https://hypersonic-sync-your-gear.base44.app";
const DEFAULT_TZ = "America/Indiana/Indianapolis";
const SEND_HOUR = 9; // 9am in the owner's local time
// Safety guard against duplicate sends within the same day; the 9am-local gate
// already limits delivery to once per day per item.
const MIN_GAP_MS = 20 * 60 * 60 * 1000;

// Hour of day (0-23) right now in the given IANA timezone, or null if invalid.
function localHour(timeZone) {
  try {
    const hour = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false })
      .formatToParts(new Date())
      .find((p) => p.type === "hour")?.value;
    const n = Number(hour);
    return Number.isFinite(n) ? n % 24 : null;
  } catch {
    return null;
  }
}

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
    const items = await svc.entities.CatalogItem.list("-created_date", 1000);
    const products = await svc.entities.Product.list("-updated_date", 1000);
    const productMap = {};
    for (const p of products) productMap[p.model_number] = p;
    const users = await svc.entities.User.list("-created_date", 1000);
    const userMap = {};
    for (const u of users) userMap[u.id] = u;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const now = Date.now();
    let sent = 0;
    let skipped = 0;

    for (const item of items) {
      if (!item.maintenance_due_date || item.maintenance_silenced) { skipped++; continue; }
      const due = new Date(item.maintenance_due_date + "T00:00:00");
      const diffDays = Math.round((due - today) / 86400000);
      if (diffDays > 7) { skipped++; continue; }

      const owner = userMap[item.created_by_id];
      if (!isOptedIn(owner, "Product Maintenance")) { skipped++; continue; }

      // Only deliver around 9am in the owner's local time (workflow runs hourly).
      if (localHour(owner?.timezone || DEFAULT_TZ) !== SEND_HOUR) { skipped++; continue; }

      const priority = diffDays <= 0 ? "critical" : "normal";
      const product = productMap[item.model_number];
      const name = product?.product_name || item.model_number || "your equipment";
      const dueStr = item.maintenance_due_date;
      const lastStr = item.last_maintenance_date || "—";
      const content = diffDays <= 0
        ? `Maintenance is overdue for ${name} (was due ${dueStr}). Last serviced ${lastStr}. Update the date or silence reminders.`
        : `Maintenance for ${name} is due in ${diffDays} day${diffDays === 1 ? "" : "s"} (${dueStr}). Last serviced ${lastStr}.`;
      const title = priority === "critical" ? "Critical maintenance reminder" : "Maintenance reminder";
      const actionUrl = `${APP_URL}/product/${item.id}`;

      // In-app alert: keep one unread per item, but always surface an upgrade
      // to "critical" even if a lower-priority unread one is still present.
      try {
        const existing = await svc.entities.AppNotification.filter({ ref_id: item.id, read: false }, "-created_date", 50);
        const hasCritical = (existing || []).some((n) => n.priority === "critical");
        const needsCreate = !existing || existing.length === 0 || (priority === "critical" && !hasCritical);
        if (needsCreate) {
          await svc.entities.AppNotification.create({
            user_id: item.created_by_id,
            title,
            content,
            category: "Product Maintenance",
            priority,
            ref_id: item.id,
            read: false,
            action_url: actionUrl
          });
        }
      } catch (e) { /* ignore in-app create failures */ }

      // Push: at most once every 24 hours per item.
      const lastSent = item.last_reminder_sent_at ? new Date(item.last_reminder_sent_at).getTime() : 0;
      if (lastSent && now - lastSent < MIN_GAP_MS) { skipped++; continue; }

      try {
        await svc.integrations.Core.SendPushNotification({
          user_id: item.created_by_id,
          title,
          content,
          action_label: "View details",
          action_url: actionUrl
        });
        await svc.entities.CatalogItem.update(item.id, { last_reminder_sent_at: new Date().toISOString() });
        sent++;
      } catch (e) {
        // Push may fail without a native mobile build — the in-app alert
        // still reached the owner.
      }
    }

    return Response.json({ ok: true, sent, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}