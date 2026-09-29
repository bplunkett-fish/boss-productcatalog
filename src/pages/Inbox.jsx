import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Bell, CheckCheck, Trash2, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { NOTIFICATION_CATEGORIES } from "@/lib/notificationCategories";
import moment from "moment";

const CATEGORY_TONE = {
  "General": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Product Maintenance": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Marketing & Advertising": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "Important Updates": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
};

export default function Inbox() {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await base44.entities.AppNotification.list("-created_date", 100);
      setList(res);
    } catch { setList([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (n) => {
    if (n.read) return;
    try {
      await base44.entities.AppNotification.update(n.id, { read: true });
      setList((prev) => (prev || []).map((x) => x.id === n.id ? { ...x, read: true } : x));
    } catch { toast({ title: "Could not update", variant: "destructive" }); }
  };

  const markAllRead = async () => {
    const unread = (list || []).filter((n) => !n.read);
    if (unread.length === 0) return;
    setBusy(true);
    for (const n of unread) {
      try { await base44.entities.AppNotification.update(n.id, { read: true }); } catch {}
    }
    setList((prev) => (prev || []).map((x) => ({ ...x, read: true })));
    setBusy(false);
  };

  const remove = async (n) => {
    setBusy(true);
    try {
      await base44.entities.AppNotification.delete(n.id);
      setList((prev) => (prev || []).filter((x) => x.id !== n.id));
    } catch { toast({ title: "Could not delete", variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const open = (n) => {
    markRead(n);
    if (!n.action_url) return;
    try {
      const url = new URL(n.action_url);
      // Alert links always point at app pages, so follow them inside the app even
      // when the link is built from the app's other address (the web address saved
      // in Settings vs the one currently open) — otherwise the tap would leave the
      // app for a browser tab instead of the product.
      const isAppPage = url.pathname === "/" || url.pathname.startsWith("/product/");
      if (url.origin === window.location.origin || isAppPage) {
        navigate(url.pathname + url.search);
      } else {
        window.open(n.action_url, "_blank");
      }
    } catch { /* ignore malformed */ }
  };

  const unreadCount = (list || []).filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 md:top-14 z-10 bg-card/80 backdrop-blur-md border-b border-border pt-safe">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} disabled={busy} className="ml-auto text-muted-foreground hover:text-foreground">
              <CheckCheck className="w-4 h-4 mr-2" /> Mark all read
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-12">
        {list === null ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
            <Bell className="w-10 h-10" />
            <p className="text-sm">You're all caught up.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((n) => (
              <li
                key={n.id}
                className={`rounded-2xl border p-4 transition-colors ${n.read ? "bg-card border-border" : n.priority === "critical" ? "bg-destructive/5 border-destructive/40" : "bg-primary/5 border-primary/30"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {n.priority === "critical" && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-destructive/10 text-destructive">
                          <AlertTriangle className="w-3 h-3" /> Critical
                        </span>
                      )}
                      {n.category && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_TONE[n.category] || "bg-muted text-muted-foreground"}`}>{n.category}</span>
                      )}
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary" aria-label="Unread" />}
                      <span className="text-xs text-muted-foreground">{moment(n.created_date).fromNow()}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.content}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {n.action_url && (
                        <Button size="sm" variant="outline" onClick={() => open(n)} className="min-h-9">
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
                        </Button>
                      )}
                      {!n.read && (
                        <Button size="sm" variant="ghost" onClick={() => markRead(n)} className="min-h-9 text-muted-foreground">
                          <CheckCheck className="w-3.5 h-3.5 mr-1.5" /> Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" disabled={busy} onClick={() => remove(n)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}