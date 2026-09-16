import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

// Bell icon with a live unread badge. Polls the user's in-app notifications
// and refreshes on realtime create/update/delete events. Links to /inbox.
export default function NotificationBell({ className }) {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await base44.entities.AppNotification.filter({ read: false }, "-created_date", 100);
        if (!cancelled) setUnread(Array.isArray(res) ? res.length : 0);
      } catch { /* ignore */ }
    };
    load();
    const unsub = base44.entities.AppNotification.subscribe(() => load());
    return () => { cancelled = true; try { unsub && unsub(); } catch {} };
  }, []);

  return (
    <button
      onClick={() => navigate("/inbox")}
      aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
      className={cn(
        "relative inline-flex items-center justify-center w-10 h-10 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}