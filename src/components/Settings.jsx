import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, Sun, Moon, Monitor, Trash2, UserCircle, LogOut, Bell } from "lucide-react";
import ChangePassword from "@/components/ChangePassword";
import ProfileEditor from "@/components/ProfileEditor";
import { NOTIFICATION_CATEGORIES } from "@/lib/notificationCategories";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [prefs, setPrefs] = useState(null);
  const [prefSaving, setPrefSaving] = useState(false);
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || user?.full_name || "Account";

  useEffect(() => {
    if (user) {
      const p = user.notification_preferences;
      setPrefs(!p || p.length === 0 ? NOTIFICATION_CATEGORIES : p);
    }
  }, [user]);

  const togglePref = async (cat) => {
    if (!prefs) return;
    const next = prefs.includes(cat) ? prefs.filter((c) => c !== cat) : [...prefs, cat];
    setPrefs(next);
    setPrefSaving(true);
    try { await base44.auth.updateMe({ notification_preferences: next }); }
    catch { /* ignore — reflects on next load */ }
    finally { setPrefSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await base44.functions.invoke("deleteAccount", {});
      base44.auth.logout();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not delete account");
      setDeleting(false);
    }
  };

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 md:top-14 z-10 bg-card/80 backdrop-blur-md border-b border-border pt-safe">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-12 space-y-8">
        {/* Account */}
        <section className="rounded-2xl bg-card border border-border p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary overflow-hidden flex items-center justify-center shrink-0">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </section>

        <ProfileEditor />

        {/* Appearance */}
        <section className="rounded-2xl bg-card border border-border p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Appearance</h2>
          <p className="text-sm text-muted-foreground mb-4">Choose how ProductSync Pro looks.</p>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-2xl bg-card border border-border p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Notification preferences</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Choose which push notification categories you receive. New users receive all by default.</p>
          <div className="space-y-2">
            {NOTIFICATION_CATEGORIES.map((cat) => {
              const on = (prefs || []).includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => togglePref(cat)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors min-h-11 text-left",
                    on ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  )}
                >
                  <span className="text-sm font-medium text-foreground">{cat}</span>
                  <span className={cn("w-10 h-6 rounded-full transition-colors relative shrink-0", on ? "bg-primary" : "bg-muted-foreground/30")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
                  </span>
                </button>
              );
            })}
          </div>
          {prefSaving && <p className="text-xs text-muted-foreground mt-2">Saving…</p>}
        </section>

        {/* Change password */}
        <ChangePassword />

        {/* Danger zone */}
        <section className="rounded-2xl bg-card border border-destructive/30 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Delete account</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all associated data. This removes your personal catalog
            and warranty registrations. This action <span className="font-semibold text-destructive">cannot be undone</span>.
          </p>

          <AlertDialog
            onOpenChange={(open) => {
              if (!open) {
                setConfirmText("");
                setError("");
              }
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="min-h-11">
                <Trash2 className="w-4 h-4 mr-2" /> Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your personal catalog and warranty registrations will be permanently removed. You will be
                  signed out immediately. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2">
                <Label htmlFor="confirm-delete">Type DELETE to confirm</Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="mt-1.5"
                  disabled={deleting}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                  disabled={deleting || confirmText !== "DELETE"}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting…</>
                  ) : (
                    "Delete forever"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>

        {/* Sign out */}
        <section className="rounded-2xl bg-card border border-border p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Sign out</h2>
          <p className="text-sm text-muted-foreground mb-4">End your session on this device.</p>
          <Button variant="outline" className="min-h-11" onClick={() => base44.auth.logout()}>
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </section>
      </main>
    </div>
  );
}