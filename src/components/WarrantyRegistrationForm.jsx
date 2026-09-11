import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  purchase_date: "",
  purchase_location: "",
  install_date: "",
  notes: ""
};

export default function WarrantyRegistrationForm({ item, product }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    name: user?.full_name || "",
    email: user?.email || ""
  }));
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("submitWarrantyRegistration", {
        serial_number: item.serial_number,
        model_number: item.model_number,
        product_name: product?.product_name || "",
        ...form
      });
      if (res.data?.status === "ok") {
        setDone(true);
      } else {
        setError(res.data?.error || "Submission failed");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
        <p className="text-emerald-700 dark:text-emerald-300 font-semibold">Warranty registration submitted</p>
        <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
          Your lifetime warranty for Model {item.model_number} (Serial {item.serial_number}) has been registered.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted border border-border">
        <ShieldCheck className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Register this product for its lifetime warranty. We'll send your details to our warranty team.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name" required>
          <Input value={form.name} onChange={set("name")} required disabled={submitting} />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={form.email} onChange={set("email")} required disabled={submitting} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={set("phone")} disabled={submitting} />
        </Field>
        <Field label="Purchase date">
          <Input type="date" value={form.purchase_date} onChange={set("purchase_date")} disabled={submitting} />
        </Field>
        <Field label="Purchase location / dealer" className="sm:col-span-2">
          <Input value={form.purchase_location} onChange={set("purchase_location")} disabled={submitting} />
        </Field>
        <Field label="Street address" className="sm:col-span-2">
          <Input value={form.street} onChange={set("street")} disabled={submitting} />
        </Field>
        <Field label="City">
          <Input value={form.city} onChange={set("city")} disabled={submitting} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="State">
            {isMobile ? (
              <Select
                value={form.state}
                onValueChange={(v) => setForm((f) => ({ ...f, state: v }))}
                disabled={submitting}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.state} onChange={set("state")} disabled={submitting} />
            )}
          </Field>
          <Field label="ZIP">
            <Input value={form.zip} onChange={set("zip")} disabled={submitting} />
          </Field>
        </div>
        <Field label="Install date">
          <Input type="date" value={form.install_date} onChange={set("install_date")} disabled={submitting} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes} onChange={set("notes")} rows={3} disabled={submitting} placeholder="Optional" />
        </Field>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="h-11 px-6">
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
          ) : (
            <><ShieldCheck className="w-4 h-4 mr-2" /> Submit registration</>
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, required, className, children }) {
  return (
    <div className={className}>
      <Label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}