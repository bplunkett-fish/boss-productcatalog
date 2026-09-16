import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Parse a free-text service interval (e.g. "Every 6 months", "Annually",
// "2 weeks", "500 hours") into a { months } or { days } duration. Returns
// null for intervals we can't schedule on a calendar (e.g. hour-based).
function parseInterval(interval) {
  const s = (interval || "").toLowerCase().trim();
  if (!s) return null;
  let m = s.match(/(\d+)\s*month/); if (m) return { months: parseInt(m[1], 10) };
  let y = s.match(/(\d+)\s*year/); if (y) return { months: parseInt(y[1], 10) * 12 };
  let w = s.match(/(\d+)\s*week/); if (w) return { days: parseInt(w[1], 10) * 7 };
  let d = s.match(/(\d+)\s*day/); if (d) return { days: parseInt(d[1], 10) };
  if (/monthly/.test(s)) return { months: 1 };
  if (/quarterly/.test(s)) return { months: 3 };
  if (/(semi-annually|bi-annually|biannually)/.test(s)) return { months: 6 };
  if (/(annually|annual|yearly)/.test(s)) return { months: 12 };
  if (/weekly/.test(s)) return { days: 7 };
  if (/daily/.test(s)) return { days: 1 };
  return null;
}

function addInterval(dateStr, interval) {
  const d = new Date(dateStr + "T00:00:00");
  if (interval.months) d.setMonth(d.getMonth() + interval.months);
  else if (interval.days) d.setDate(d.getDate() + interval.days);
  return d.toISOString().slice(0, 10);
}

// Records the date a customer last performed preventative maintenance on a
// catalog item, then computes the next due date from the product's service
// interval. Updating the date resets any silenced reminders (fresh cycle).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const itemId = (body.catalog_item_id || '').trim();
    const lastDate = (body.last_maintenance_date || '').trim();
    if (!itemId) return Response.json({ error: 'catalog_item_id is required' }, { status: 400 });
    if (!lastDate) return Response.json({ error: 'last_maintenance_date is required' }, { status: 400 });

    const item = await base44.entities.CatalogItem.get(itemId);
    if (!item) return Response.json({ error: 'Catalog item not found' }, { status: 404 });

    let dueDate = null;
    if (item.model_number) {
      const products = await base44.entities.Product.filter({ model_number: item.model_number }, '-updated_date', 1);
      const product = products && products.length > 0 ? products[0] : null;
      const interval = product?.service_interval ? parseInterval(product.service_interval) : null;
      if (interval) dueDate = addInterval(lastDate, interval);
    }

    const updated = await base44.entities.CatalogItem.update(itemId, {
      last_maintenance_date: lastDate,
      maintenance_due_date: dueDate,
      maintenance_silenced: false
    });
    return Response.json({ ok: true, item: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}