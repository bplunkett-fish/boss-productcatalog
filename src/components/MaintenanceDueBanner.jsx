import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight, X } from "lucide-react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";

// Prominent banner shown on the catalog dashboard for items whose maintenance
// is due within the next 7 days (overdue items are surfaced separately in red).
// Silenced items are excluded. Dismissable per session so it stays noticeable
// without nagging once acknowledged.
export default function MaintenanceDueBanner({ items = [] }) {
  const [dismissed, setDismissed] = useState(false);

  const { overdue, upcoming } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const weekAway = new Date(now);
    weekAway.setDate(weekAway.getDate() + 7);
    const overdue = [];
    const upcoming = [];
    for (const it of items) {
      if (!it.maintenance_due_date || it.maintenance_silenced) continue;
      const due = parseISO(it.maintenance_due_date);
      due.setHours(0, 0, 0, 0);
      if (due > weekAway) continue;
      const days = differenceInCalendarDays(due, now);
      const label = it.product?.product_name || `Model ${it.model_number}`;
      const entry = { id: it.id, label, serial: it.serial_number, due, days };
      if (days < 0) overdue.push(entry);
      else upcoming.push(entry);
    }
    upcoming.sort((a, b) => a.days - b.days);
    overdue.sort((a, b) => a.days - b.days);
    return { overdue, upcoming };
  }, [items]);

  const total = overdue.length + upcoming.length;
  if (dismissed || total === 0) return null;

  const hasOverdue = overdue.length > 0;

  return (
    <div
      role="alert"
      className={`rounded-2xl border-2 p-4 sm:p-5 shadow-sm ${
        hasOverdue
          ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800"
          : "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            hasOverdue
              ? "bg-red-600 text-white"
              : "bg-amber-500 text-white"
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`text-base sm:text-lg font-bold leading-tight ${
            hasOverdue ? "text-red-900 dark:text-red-200" : "text-amber-900 dark:text-amber-200"
          }`}>
            {hasOverdue
              ? `${overdue.length} ${overdue.length === 1 ? "product needs" : "products need"} maintenance now`
              : `${upcoming.length} ${upcoming.length === 1 ? "product has" : "products have"} maintenance due within a week`}
          </h2>
          <p className={`text-sm mt-0.5 ${
            hasOverdue ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"
          }`}>
            {hasOverdue
              ? "Overdue service should be scheduled as soon as possible."
              : "Schedule service soon to stay ahead of the due date."}
          </p>

          <ul className="mt-3 space-y-1.5">
            {overdue.map((e) => (
              <DueRow key={`o-${e.id}`} entry={e} overdue />
            ))}
            {upcoming.map((e) => (
              <DueRow key={`u-${e.id}`} entry={e} />
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss maintenance alert"
          className={`shrink-0 -mt-1 -mr-1 p-1.5 rounded-lg ${
            hasOverdue
              ? "text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
              : "text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function DueRow({ entry, overdue }) {
  const dueLabel = overdue
    ? `${Math.abs(entry.days)} ${Math.abs(entry.days) === 1 ? "day" : "days"} overdue`
    : entry.days === 0
      ? "Due today"
      : `Due in ${entry.days} ${entry.days === 1 ? "day" : "days"}`;
  return (
    <li>
      <Link
        to={`/product/${entry.id}`}
        className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 -mx-2.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
          overdue
            ? "text-red-900 dark:text-red-100"
            : "text-amber-900 dark:text-amber-100"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{entry.label}</span>
          <span className="text-xs opacity-70 hidden sm:inline">SN {entry.serial}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium opacity-80">{format(entry.due, "MMM d")}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            overdue
              ? "bg-red-600 text-white"
              : "bg-amber-500/90 text-white"
          }`}>
            {dueLabel}
          </span>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </span>
      </Link>
    </li>
  );
}