import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// Admin control for the address the app links back to (notification links and
// QR claim links). Change it when the app moves to a different domain — no code
// change needed. Blank means the app's default address is used.
export default function AppBaseUrlSetting() {
  const [record, setRecord] = useState(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const rows = await base44.entities.AppSetting.list();
        const row = rows[0] || null;
        setRecord(row);
        setValue(row?.app_base_url || "");
      } catch {
        setError("Could not load the current address.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    const next = value.trim().replace(/\/+$/, "");
    if (next && !/^https?:\/\/\S+$/i.test(next)) {
      setError("Enter the full address, starting with https://");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (record) {
        await base44.entities.AppSetting.update(record.id, { app_base_url: next });
      } else {
        setRecord(await base44.entities.AppSetting.create({ app_base_url: next }));
      }
      setValue(next);
      toast({
        title: "App address saved",
        description: next ? `Links now point to ${next}.` : "Links use the app's default address.",
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not save the address.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-border pt-4">
      <p className="text-sm font-medium text-foreground">App web address</p>
      <p className="text-sm text-muted-foreground mt-1">
        Used in the links the app sends out — notification links and the claim links in QR codes. Update it
        whenever the app moves to a different domain.
      </p>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-3" />
      ) : (
        <div className="flex items-center gap-2 mt-3">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://app.example.com"
            className="h-11"
            disabled={saving}
            aria-label="App web address"
          />
          <Button className="h-11 shrink-0" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        Changing this address requires rebuilding the mobile app before phone notifications open it — publish
        your changes, then generate new app store files under Publish → Mobile app.
      </p>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  );
}