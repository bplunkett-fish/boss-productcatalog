import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, Loader2, Trash2, Image as ImageIcon } from "lucide-react";

// Image field: preview + upload (stored in the app backend) + optional URL
// import. Replaces a plain image_url text input with a native upload/replace
// control so product images live in the app's storage, not on external hosts.
export default function ImageField({ value, onChange, label = "Image" }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlValue, setUrlValue] = useState("");

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      onChange(file_url);
    } catch (err) {
      alert(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const importUrl = async () => {
    const v = urlValue.trim();
    if (!v) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke("importFileFromUrl", { url: v });
      if (res.data?.file_url) {
        onChange(res.data.file_url);
        setUrlMode(false);
        setUrlValue("");
      } else if (res.data?.error) {
        alert(res.data.error);
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 flex items-start gap-3">
        <div className="w-24 h-24 rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center shrink-0">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-1" />}
            {value ? "Replace image" : "Upload image"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive justify-start" onClick={() => onChange("")} disabled={busy}>
              <Trash2 className="w-4 h-4 mr-1" /> Remove
            </Button>
          )}
          <Button type="button" variant="link" size="sm" className="h-7 px-0 text-muted-foreground justify-start" onClick={() => setUrlMode(v => !v)} disabled={busy}>
            {urlMode ? "Cancel URL" : "Or paste a URL"}
          </Button>
          {urlMode && (
            <div className="flex gap-1">
              <Input value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder="https://…" className="h-8" disabled={busy} />
              <Button type="button" size="sm" onClick={importUrl} disabled={busy}>Import</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}