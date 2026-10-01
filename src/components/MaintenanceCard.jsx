import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Bell, BellOff, Wrench, CalendarClock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { getMaintenanceStatus } from "@/lib/maintenanceStatus";

const TONE = {
  muted: "bg-muted text-muted-foreground",
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  destructive: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
};

export default function MaintenanceCard({ item, product, onUpdated }) {
  const [date, setDate] = useState(item.last_maintenance_date || "");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const interval = product?.service_interval;
  const due = item.maintenance_due_date;
  const status = getMaintenanceStatus(item, product);

  const save = async () => {
    if (!date) { toast({ title: "Pick a date first", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await base44.functions.invoke("setMaintenanceDate", {
        catalog_item_id: item.id,
        last_maintenance_date: date
      });
      toast({
        title: "Maintenance updated",
        description: res.data?.item?.maintenance_due_date ? `Next service due ${res.data.item.maintenance_due_date}` : undefined
      });
      onUpdated?.();
    } catch (err) {
      toast({ title: "Could not update", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const toggleSilence = async () => {
    setToggling(true);
    const next = !item.maintenance_silenced;
    try {
      await base44.entities.CatalogItem.update(item.id, { maintenance_silenced: next });
      toast({ title: next ? "Reminders silenced" : "Reminders resumed" });
      onUpdated?.();
    } catch (err) {
      toast({ title: "Could not update", variant: "destructive" });
    } finally { setToggling(false); }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 sm:p-7">
      <div className="flex items-center gap-2 mb-1">
        <Wrench className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Preventative maintenance</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        {interval ? `Service interval: ${interval}` : "No service interval defined for this model."}
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${TONE[status.tone]}`}>
          <CalendarClock className="w-3.5 h-3.5" />
          {status.text}
        </span>
        {item.maintenance_silenced && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <BellOff className="w-3.5 h-3.5" /> Reminders silenced
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="last-maint">Last performed maintenance</Label>
          <Input id="last-maint" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Next service due</Label>
          <div className="mt-1 h-9 flex items-center px-3 rounded-md border border-input bg-muted/40 text-sm font-mono text-foreground">
            {due || "—"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        <Button onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Update maintenance date"}
        </Button>
        <Button variant="outline" onClick={toggleSilence} disabled={toggling}>
          {toggling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            : item.maintenance_silenced ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}
          {item.maintenance_silenced ? "Resume reminders" : "Silence reminders"}
        </Button>
      </div>
    </div>
  );
}