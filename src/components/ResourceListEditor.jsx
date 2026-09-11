import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, UploadCloud, Loader2 } from "lucide-react";

// Generic editor for an array of plain objects. `fields` describes the keys of
// each row: [{ key, label, type?, upload? }]. type "number" parses numeric
// input. upload true renders an upload button next to the URL field that stores
// the file in the app backend and writes the resulting URL into the field.
export default function ResourceListEditor({ items = [], fields, onChange }) {
  const fileInputRef = useRef(null);
  const [pending, setPending] = useState(null); // { idx, fieldKey }
  const [uploading, setUploading] = useState(false);

  const update = (idx, key, value) => {
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
    setPending({ idx, fieldKey });
    fileInputRef.current?.click();
  };

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pending) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const patch = { [pending.fieldKey]: file_url };
      // Auto-fill the file_type field (manuals) from the uploaded extension.
      if (fields.some(f => f.key === "file_type")) {
        const ext = file.name.split(".").pop().toLowerCase();
        patch.file_type = ext;
      }
      updateMany(pending.idx, patch);
    } catch (err) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setPending(null);
    }
  };

  const isUploadingField = (idx, key) =>
    uploading && pending?.idx === idx && pending?.fieldKey === key;

  return (
    <div className="space-y-2">
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChosen} />
      {items.map((it, idx) => (
        <div key={idx} className="flex flex-wrap items-start gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50">
          {fields.map(f => (
            <div key={f.key} className="flex-1 min-w-[140px]">
              <label className="text-xs text-slate-500">{f.label}</label>
              <div className="flex gap-1 mt-0.5">
                <Input
                  type={f.type === "number" ? "number" : "text"}
                  value={it[f.key] ?? ""}
                  onChange={(e) =>
                    update(idx, f.key, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)
                  }
                  className="h-9"
                  disabled={isUploadingField(idx, f.key)}
                />
                {f.upload && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => triggerUpload(idx, f.key)}
                    disabled={uploading}
                    title="Upload a file"
                  >
                    {isUploadingField(idx, f.key)
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
            className="mt-5 text-red-600 hover:bg-red-50"
            onClick={() => removeRow(idx)}
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