import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Loader2 } from "lucide-react";
import ResourceListEditor from "@/components/ResourceListEditor";
import ImageField from "@/components/ImageField";
import { useIsMobile } from "@/hooks/use-mobile";

const RESOURCE_FIELDS = {
  manuals: [
    { key: "title", label: "Title" },
    { key: "url", label: "URL", upload: true },
    { key: "file_type", label: "Type" }
  ],
  wiring_diagrams: [
    { key: "title", label: "Title" },
    { key: "url", label: "URL", upload: true }
  ],
  videos: [
    { key: "title", label: "Title" },
    { key: "url", label: "URL" },
    { key: "thumbnail", label: "Thumbnail URL" }
  ],
  faqs: [
    { key: "question", label: "Question" },
    { key: "answer", label: "Answer" }
  ],
  troubleshooting: [
    { key: "problem", label: "Problem" },
    { key: "solution", label: "Solution" }
  ],
  parts_links: [
    { key: "part_number", label: "Part #" },
    { key: "name", label: "Name" },
    { key: "url", label: "URL" }
  ],
  literature: [
    { key: "title", label: "Title" },
    { key: "url", label: "URL", upload: true },
    { key: "file_type", label: "Type" }
  ]
};

const RESOURCE_LABELS = {
  manuals: "Manuals",
  wiring_diagrams: "Wiring Diagrams",
  videos: "Videos",
  faqs: "FAQs",
  troubleshooting: "Troubleshooting",
  parts_links: "Common Wear Parts",
  literature: "Product Literature"
};

export default function ProductEditor({ open, product, onClose, onSave }) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({
        model_number: product?.model_number || "",
        product_name: product?.product_name || "",
        product_description: product?.product_description || "",
        category: product?.category || "",
        manufacturer: product?.manufacturer || "",
        service_interval: product?.service_interval || "",
        image_url: product?.image_url || "",
        manuals: product?.manuals || [],
        wiring_diagrams: product?.wiring_diagrams || [],
        videos: product?.videos || [],
        faqs: product?.faqs || [],
        troubleshooting: product?.troubleshooting || [],
        parts_links: product?.parts_links || [],
        literature: product?.literature || []
      });
      setError("");
    }
  }, [open, product]);

  if (!form) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.model_number.trim() || !form.product_name.trim()) {
      setError("Model number and product name are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...form,
        model_number: form.model_number.trim().toUpperCase(),
        product_name: form.product_name.trim()
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <div className="space-y-5 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Model number *</Label>
          <Input value={form.model_number} onChange={(e) => set("model_number", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Product name *</Label>
          <Input value={form.product_name} onChange={(e) => set("product_name", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Category</Label>
          <Input value={form.category} onChange={(e) => set("category", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Manufacturer</Label>
          <Input value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <Label>Service interval</Label>
          <Input value={form.service_interval} onChange={(e) => set("service_interval", e.target.value)} placeholder="e.g. Every 6 months, 500 hours, Annually" className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <ImageField value={form.image_url} onChange={(v) => set("image_url", v)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Textarea value={form.product_description} onChange={(e) => set("product_description", e.target.value)} rows={3} className="mt-1" />
        </div>
      </div>

      {Object.keys(RESOURCE_FIELDS).map(key => (
        <div key={key}>
          <Label className="text-sm font-semibold">{RESOURCE_LABELS[key]}</Label>
          <div className="mt-2">
            <ResourceListEditor
              items={form[key]}
              fields={RESOURCE_FIELDS[key]}
              onChange={(arr) => set(key, arr)}
            />
          </div>
        </div>
      ))}
    </div>
  );

  const footer = (
    <>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save product"}
        </Button>
      </div>
    </>
  );

  // Bottom sheet on mobile, centered dialog on desktop.
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{product ? "Edit product" : "New product"}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto" style={{ maxHeight: "70vh" }}>
            {body}
          </div>
          <DrawerFooter className="px-4">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>
        {body}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}