import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Send, Trash2, Bell } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { NOTIFICATION_CATEGORIES } from "@/lib/notificationCategories";
import moment from "moment";

const CATEGORY_TONE = {
  "General": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Product Maintenance": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Marketing & Advertising": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "Important Updates": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(NOTIFICATION_CATEGORIES[0]);
  const [sendImmediately, setSendImmediately] = useState(true);
  const [sendAt, setSendAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await base44.entities.ScheduledNotification.list("-created_date", 50);
      setList(res);
    } catch { setList([]); }
  }, []);

  useEffect(() => { if (user && user.role !== "admin") navigate("/", { replace: true }); }, [user]);
  useEffect(() => { if (user?.role === "admin") load(); }, [user, load]);

  if (!user || user.role !== "admin") return null;

  const submit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: "Title and message are required", variant: "destructive" });
      return;
    }
    if (!sendImmediately && (!sendAt || isNaN(new Date(sendAt).getTime()))) {
      toast({ title: "Pick a valid date and time", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const iso = sendImmediately ? new Date().toISOString() : new Date(sendAt).toISOString();
      await base44.entities.ScheduledNotification.create({
        title: title.trim(),
        content: content.trim(),
        category,
        send_at: iso,
        status: "pending",
        sent_count: 0
      });
      if (sendImmediately || new Date(iso) <= new Date()) {
        try { await base44.functions.invoke("processScheduledNotifications", {}); } catch {}
      }
      toast({ title: sendImmediately ? "Notification sent" : "Notification scheduled" });
      setTitle("");
      setContent("");
      setSendAt("");
      await load();
    } catch (err) {
      toast({ title: "Could not save", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const cancel = async (n) => {
    setBusy(true);
    try {
      await base44.entities.ScheduledNotification.delete(n.id);
      await load();
      toast({ title: "Notification cancelled" });
    } catch (err) {
      toast({ title: "Could not cancel", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 md:top-14 z-10 bg-card/80 backdrop-blur-md border-b border-border pt-safe">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Messaging</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-12 space-y-6">
        <section className="rounded-2xl bg-card border border-border p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Compose push notification</h2>
          <p className="text-sm text-muted-foreground mb-4">Sends a push to every user who opted into the chosen category.</p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="n-title">Title</Label>
              <Input id="n-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New software update available" className="mt-1" maxLength={100} />
            </div>
            <div>
              <Label htmlFor="n-cat">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="n-cat" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="n-content">Message</Label>
              <Textarea id="n-content" value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="Write the notification body…" className="mt-1" maxLength={500} />
            </div>
            <div className="flex flex-col gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer min-h-11">
                <input type="checkbox" checked={sendImmediately} onChange={(e) => setSendImmediately(e.target.checked)} className="w-4 h-4 rounded border-input" />
                Send immediately
              </label>
              {!sendImmediately && (
                <div>
                  <Label htmlFor="n-when">Send at</Label>
                  <Input id="n-when" type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} className="mt-1" />
                </div>
              )}
            </div>
            <Button onClick={submit} disabled={saving} className="min-h-11">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : <><Send className="w-4 h-4 mr-2" /> {sendImmediately ? "Send now" : "Schedule notification"}</>}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-border p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Push history &amp; scheduled</h2>
          {list === null ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Bell className="w-8 h-8" />
              <p className="text-sm">No notifications yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((n) => (
                <li key={n.id} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_TONE[n.category] || "bg-muted text-muted-foreground"}`}>{n.category}</span>
                      <span className={`text-xs ${n.status === "sent" ? "text-emerald-600" : "text-amber-600"}`}>
                        {n.status === "sent" ? `Sent · ${n.sent_count || 0} recipients` : "Pending"}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground mt-1 truncate">{n.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{n.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{moment(n.send_at).format("MMM D, YYYY h:mm A")}</p>
                  </div>
                  {n.status === "pending" && (
                    <Button size="icon" variant="ghost" disabled={busy} onClick={() => cancel(n)} className="text-destructive hover:bg-destructive/10 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}