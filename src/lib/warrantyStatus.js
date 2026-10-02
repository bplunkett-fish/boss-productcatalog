import { base44 } from "@/api/base44Client";

// Warranty states a unit can be in, matching the values the ERP feed will send.
export const WARRANTY_STATUSES = ["Active", "Available", "Expired", "Pending Verification"];

// Badge colours per status. Literal class strings so Tailwind keeps them.
const STYLES = {
  Active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  Available: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  Expired: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
  "Pending Verification": "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
};

export function warrantyStatusStyle(status) {
  return STYLES[status] || "bg-muted text-muted-foreground border-border";
}

// Serial number → warranty status for the given catalog items. Warranty belongs
// to the unit, so it is looked up from the serial records rather than stored on
// the catalog item. A unit with no status on file is simply left out, and a
// failed lookup leaves every status unset instead of breaking the page.
export async function loadWarrantyStatuses(items) {
  const serials = (items || []).map((i) => i.serial_number).filter(Boolean);
  if (serials.length === 0) return {};
  try {
    const records = await base44.entities.ProductRecord.filter({ serial_number: { $in: serials } });
    const map = {};
    for (const r of records) {
      if (r.warranty_status) map[r.serial_number] = r.warranty_status;
    }
    return map;
  } catch {
    return {};
  }
}