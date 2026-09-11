import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

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
      <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
        <p className="text-emerald-800 font-semibold">Warranty registration submitted</p>
        <p className="text-sm text-emerald-600 mt-1">
          Your lifetime warranty for Model {item.model_number} (Serial {item.serial_number}) has been registered.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <ShieldCheck className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
        <p className="text-sm text-slate-600">
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
            <Input value={form.state} onChange={set("state")} disabled={submitting} />
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
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">
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
      <Label className="text-sm font-medium text-slate-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}