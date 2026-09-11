import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";

export default function ProductCsvImport() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const up = await base44.integrations.Core.UploadPublicFile({ file });
      const res = await base44.functions.invoke("importProductRecords", { file_url: up.file_url });
      setResult(res.data);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          <FileSpreadsheet className="w-5 h-5 text-slate-500" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">Import models from CSV</p>
          <p className="text-sm text-slate-500 mt-1">
            Bulk-load model-level records into the Product Database. Required columns:{" "}
            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">model_number, product_name</span>
            {" "}— optional:{" "}
            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">product_description, category, manufacturer, image_url</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <label className="flex-1 cursor-pointer">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); setError(""); }}
          />
          <div className="flex items-center gap-2 px-4 h-11 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm text-slate-600">
            <UploadCloud className="w-4 h-4" />
            {file ? file.name : "Choose a CSV or Excel file…"}
          </div>
        </label>
        <Button onClick={handleUpload} disabled={busy || !file} className="h-11">
          {busy ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</>
          ) : (
            <><UploadCloud className="w-4 h-4 mr-2" /> Import</>
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-3 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {result && (
        <div className="mt-4 flex items-start gap-3 p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="text-sm">
            Imported {result.total} model{result.total === 1 ? "" : "s"} — {result.created} new, {result.updated} updated.
          </span>
        </div>
      )}
    </div>
  );
}