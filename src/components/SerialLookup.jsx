import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, CheckCircle2, PackagePlus, AlertCircle } from "lucide-react";

export default function SerialLookup({ onAdded }) {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!serial.trim()) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("lookupProductBySerial", {
        serial_number: serial.trim(),
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!result?.product) return;
    setAdding(true);
    setError("");
    try {
      const res = await base44.functions.invoke("addProductToCatalog", {
        product: result.product,
      });
      const data = res.data;
      if (data.status === "already_claimed") {
        setError(data.message || "This serial number has already been added to another owner's catalog.");
      } else {
        // "created" or "already_in_catalog" — clear the lookup and refresh the catalog
        setSerial("");
        setResult(null);
        onAdded?.();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not add to catalog");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
          <Input
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="Enter a product serial number…"
            className="pl-12 h-14 text-base sm:text-lg bg-white border-2 border-slate-200 focus-visible:border-slate-900 transition-colors"
            disabled={loading}
          />
        </div>
        <Button type="submit" size="lg" className="h-14 px-8 text-base font-medium" disabled={loading || !serial.trim()}>
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Looking up…
            </>
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" /> Look up
            </>
          )}
        </Button>
      </form>

      {error && (
        <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {result && !result.found && (
        <div className="mt-6 p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
          <p className="text-amber-800 font-medium">
            No product found for serial <span className="font-mono">{result.serial_number}</span>
          </p>
          <p className="text-sm text-amber-600 mt-1">Try one of the sample serials: SN-10045-A, SN-22087-B, SN-55301-C</p>
        </div>
      )}

      {result && result.found && (
        <div className="mt-6 p-6 rounded-2xl bg-white border-2 border-slate-200 shadow-sm">
          <div className="flex items-start gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-sm font-medium text-emerald-700">Product found in SAGE ERP</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-5">
            {result.product.image_url && (
              <img
                src={result.product.image_url}
                alt={result.product.product_name}
                className="w-full sm:w-40 h-40 object-cover rounded-xl bg-slate-100 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                {result.product.category}
              </span>
              <h3 className="text-xl font-semibold text-slate-900 leading-tight">{result.product.product_name}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {result.product.manufacturer} · Model {result.product.model_number}
              </p>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">{result.product.product_description}</p>
              <Button onClick={handleAdd} disabled={adding} className="mt-4 h-11">
                {adding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding…
                  </>
                ) : (
                  <>
                    <PackagePlus className="w-4 h-4 mr-2" /> Add to my catalog
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}