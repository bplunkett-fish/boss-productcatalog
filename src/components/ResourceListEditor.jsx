import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, UploadCloud, Loader2 } from "lucide-react";
import { findStoredDuplicate } from "@/lib/fileDuplicates";
import { useToast } from "@/components/ui/use-toast";

// Generic editor for an array of plain objects. `fields` describes the keys of
// each row: [{ key, label, type?, upload? }]. type "number" parses numeric
// input. upload true renders an upload button (local file) next to the URL
// field AND auto-imports the file from a pasted URL when the field loses focus
// — the file is stored in the app backend, just like a direct upload.
const isInternalUrl = (u) => /base44\.com|wixstatic\.com/i.test(u);
const isFetchableUrl = (u) => /^https?:\/\//i.test(u) && !isInternalUrl(u);

export default function ResourceListEditor({ items = [], fields, onChange }) {
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const dirtyRef = useRef(new Set());
  const [active, setActive] = useState(null); // { idx, fieldKey, kind }

  const update = (idx, key, value) => {
    dirtyRef.current.add(`${idx}:${key}`);
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: value } : it));
    onChange(next);
  };
  const updateMany = (idx, patch) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  };
  const addRow = () => {
    const blank = {};
    fields.forEach(f => { blank[f.key] = ""; });
    onChange([...items, blank]);
  };
  const removeRow = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const triggerUpload = (idx, fieldKey) => {
    setActive({ idx, fieldKey, kind: "upload" });
    fileInputRef.current?.click();
  };

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !active) return;
    try {
      // Reuse a document already stored for any product rather than uploading a
      // second copy of the same file (same file name AND identical contents).
      const storedUrl = await findStoredDuplicate(file, items.map(it => it?.[active.fieldKey]));
      let file_url = storedUrl;
      if (!file_url) {
        const uploaded = await base44.integrations.Core.UploadPublicFile({ file });
        file_url = uploaded.file_url;
      }
      const patch = { [active.fieldKey]: file_url };
      if (fields.some(f => f.key === "file_type")) {
        patch.file_type = file.name.split(".").pop().toLowerCase();
      }
      updateMany(active.idx, patch);
      if (storedUrl) {
        toast({ description: `“${file.name}” is already stored — linked the existing copy instead of uploading it again.` });
      }
    } catch (err) {
      alert(err.message || "Upload failed");
    } finally {
      setActive(null);
    }
  };

  const handleUrlBlur = async (idx, fieldKey, value) => {
    const key = `${idx}:${fieldKey}`;
    const edited = dirtyRef.current.has(key);
    dirtyRef.current.delete(key);
    if (!edited) return; // don't re-fetch pre-existing links on casual blur
    const v = (value || "").trim();
    if (!isFetchableUrl(v)) return;
    setActive({ idx, fieldKey, kind: "import" });
    try {
      const res = await base44.functions.invoke("importFileFromUrl", { url: v });
      const data = res.data;
      if (data?.file_url) {
        const patch = { [fieldKey]: data.file_url };
        if (fields.some(f => f.key === "file_type") && data.file_type) {
          patch.file_type = data.file_type;
        }
        updateMany(idx, patch);
      }
    } catch (err) {
      // leave the original URL so the manual link still works
      alert(err.response?.data?.error || err.message || "Import from URL failed");
    } finally {
      setActive(null);
    }
  };

  const isBusy = (idx, key) => active?.idx === idx && active?.fieldKey === key;

  return (
    <div className="space-y-2">
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChosen} />
      {items.map((it, idx) => (
        <div key={idx} className="flex flex-wrap items-start gap-2 p-3 rounded-lg border border-border bg-muted">
          {fields.map(f => (
            <div key={f.key} className="flex-1 min-w-[140px]">
              <label className="text-xs text-muted-foreground">{f.label}</label>
              <div className="flex gap-1 mt-0.5">
                <Input
                  type={f.type === "number" ? "number" : "text"}
                  value={it[f.key] ?? ""}
                  onChange={(e) =>
                    update(idx, f.key, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)
                  }
                  onBlur={f.upload ? (e) => handleUrlBlur(idx, f.key, e.target.value) : undefined}
                  className="h-9"
                  disabled={isBusy(idx, f.key)}
                />
                {f.upload && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 sm:h-9 sm:w-9 shrink-0"
                    onClick={() => triggerUpload(idx, f.key)}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={!!active}
                    aria-label="Upload a file"
                    title="Upload a file"
                  >
                    {isBusy(idx, f.key)
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <UploadCloud className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-5 h-11 w-11 sm:h-9 sm:w-9 text-destructive hover:bg-destructive/10"
            onClick={() => removeRow(idx)}
            onMouseDown={(e) => e.preventDefault()}
            aria-label="Remove row"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="w-4 h-4 mr-1" /> Add row
      </Button>
    </div>
  );
}