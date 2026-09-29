import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Push notifications deep-link into the app carrying ?mark_read=<alert id>.
// Arriving anywhere with that parameter means the push was tapped, so the alert
// it refers to can be marked read without the user opening the inbox. Runs once
// per page load, strips the parameter so a refresh or a shared URL does not
// re-apply it, and the update is scoped to the signed-in user — a stale or
// someone else's id simply does nothing.
export default function NotificationDeepLink() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("mark_read");
    if (!id) return;

    base44.entities.AppNotification.update(id, { read: true }).catch(() => {});

    params.delete("mark_read");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (query ? `?${query}` : "") + window.location.hash,
    );
  }, []);

  return null;
}