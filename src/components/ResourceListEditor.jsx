import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

// Generic editor for an array of plain objects. `fields` describes the keys of
// each row: [{ key, label, type? }]. type "number" parses numeric input.
export default function ResourceListEditor({ items = [], fields, onChange }) {
  const update = (idx, key, value) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: value } : it));
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

  return (
    <div className="space-y-2">
      {items.map((it, idx) => (
        <div key={idx} className="flex flex-wrap items-start gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50">
          {fields.map(f => (
            <div key={f.key} className="flex-1 min-w-[140px]">
              <label className="text-xs text-slate-500">{f.label}</label>
              <Input
                type={f.type === "number" ? "number" : "text"}
                value={it[f.key] ?? ""}
                onChange={(e) =>
                  update(idx, f.key, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)
                }
                className="h-9 mt-0.5"
              />
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