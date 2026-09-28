import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// Keeps the signed-in user's IANA timezone current so scheduled jobs (e.g.
// maintenance reminders) can deliver around 9am in the user's local time.
// Runs once per app load and only writes when the stored value is missing or
// stale, so it self-heals when the user changes timezones.
export default function TimezoneSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let tz = null;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { tz = null; }
    if (!tz || tz === user.timezone) return;
    base44.auth.updateMe({ timezone: tz }).catch(() => {});
  }, [user]);

  return null;
}