import React from "react";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";

// Shown when a screen is displaying the copy this device saved instead of fresh
// data, so an old catalog is never mistaken for the current one.
export default function OfflineDataNotice({ savedAt, onRetry }) {
  let when = "";
  try {
    when = savedAt ? format(parseISO(savedAt), "MMM d, h:mm a") : "";
  } catch {
    when = "";
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <CloudOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">No connection — showing saved data</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          This device's copy{when ? ` from ${when}` : ""}. Look-ups, linked documents and changes need a connection.
        </p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" className="shrink-0" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}