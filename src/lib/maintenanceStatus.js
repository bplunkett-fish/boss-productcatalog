// Single source of truth for reading a unit's preventative-maintenance state.
// The product page uses it to decide WHERE the maintenance card belongs, and the
// card uses it to decide WHAT it says — so the two can never disagree.

export function getMaintenanceStatus(item, product) {
  const interval = product?.service_interval;
  const due = item?.maintenance_due_date;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueDate = due ? new Date(due + "T00:00:00") : null;
  const diffDays = dueDate ? Math.round((dueDate - today) / 86400000) : null;

  if (!interval) return { text: "No service interval set for this model", tone: "muted", diffDays };
  if (!item?.last_maintenance_date) return { text: "Record your last maintenance to start tracking", tone: "muted", diffDays };
  if (!due) return { text: `Interval "${interval}" can't be scheduled automatically`, tone: "muted", diffDays };
  if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`, tone: "destructive", diffDays };
  if (diffDays <= 7) return { text: `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`, tone: "warning", diffDays };
  return { text: `Due in ${diffDays} days`, tone: "ok", diffDays };
}

// True when the service is due within the next seven days, or is already overdue.
export function isMaintenanceDueSoon(item, product) {
  const { diffDays } = getMaintenanceStatus(item, product);
  return diffDays !== null && diffDays <= 7;
}