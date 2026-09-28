import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// Admin control for self-registration. Off means the sign-up screen only lets
// through emails that have been invited; invited people are never blocked.
export default function RegistrationToggle() {
  const [record, setRecord] = useState(null);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await base44.entities.AppSetting.list();
        const row = rows[0] || null;
        setRecord(row);
        setEnabled(row ? row.registration_enabled !== false : true);
      } catch {
        // A missing or unreadable setting means registration stays open.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = async (next) => {
    setSaving(true);
    try {
      if (record) {
        await base44.entities.AppSetting.update(record.id, { registration_enabled: next });
      } else {
        const created = await base44.entities.AppSetting.create({ registration_enabled: next });
        setRecord(created);
      }
      setEnabled(next);
      toast({
        title: next ? "Registration is open" : "Registration is closed",
        description: next
          ? "Anyone can create an account from the sign-up screen."
          : "Only people you invite can create an account.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not save the setting",
        description: err.response?.data?.error || err.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
      <div>
        <p className="text-sm font-medium text-foreground">Allow new registrations</p>
        <p className="text-sm text-muted-foreground mt-1">
          When off, the sign-up screen only accepts email addresses you have invited. People you invite
          can always join.
        </p>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground shrink-0 mt-1" />
      ) : (
        <Switch
          checked={enabled}
          onCheckedChange={toggle}
          disabled={saving}
          aria-label="Allow new registrations"
        />
      )}
    </div>
  );
}