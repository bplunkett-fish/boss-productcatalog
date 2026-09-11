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
      const res = await base44.functions.invoke("lookupProductBySerial", { serial_number: serial.trim() });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  // Optimistic add: insert a pending catalog item immediately, reconcile on response.
  const handleAdd = async () => {
    if (!result?.found) return;
    setAdding(true);
    setError("");
    // Optimistically show the item in the catalog right away.
    const pending = {
      id: `pending-${Date.now()}`,
      serial_number: result.serial_number,
      model_number: result.model_number,
      product: result.product || null,
      _pending: true,
    };
    onAdded?.({ type: "optimistic_add", item: pending });
    try {
      const res = await base44.functions.invoke("addProductToCatalog", {
        serial_number: result.serial_number,
        model_number: result.model_number
      });
      const data = res.data;
      if (data.status === "already_claimed") {
        // Roll back the optimistic item.
        onAdded?.({ type: "optimistic_rollback", id: pending.id });
        setError(data.message || "This serial number has already been added to another owner's catalog.");
      } else {
        // Reconcile: replace the pending placeholder with the real list.
        setSerial("");
        setResult(null);
        onAdded?.({ type: "optimistic_commit", id: pending.id });
      }
    } catch (err) {
      onAdded?.({ type: "optimistic_rollback", id: pending.id });
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
            className="pl-12 h-14 text-base sm:text-lg bg-card border-2 border-border focus-visible:border-ring transition-colors"
            disabled={loading}
          />
        </div>
        <Button type="submit" size="lg" className="h-14 px-8 text-base font-medium" disabled={loading || !serial.trim()}>
          {loading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Looking up…</>
          ) : (
            <><Search className="w-5 h-5 mr-2" /> Look up</>
          )}
        </Button>
      </form>

      {error && (
        <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {result && !result.found && (
        <div className="mt-6 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
          <p className="text-amber-700 dark:text-amber-300 font-medium">
            No product found for serial <span className="font-mono">{result.serial_number}</span>
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">Try one of the sample serials: SN-10045-A, SN-22087-B, SN-55301-C</p>
        </div>
      )}

      {result && result.found && (
        <div className="mt-6 p-6 rounded-2xl bg-card border-2 border-border shadow-sm">
          <div className="flex items-start gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Matched model <span className="font-mono">{result.model_number}</span></span>
          </div>
          <div className="flex flex-col sm:flex-row gap-5">
            {result.product?.image_url && (
              <img
                src={result.product.image_url}
                alt={result.product.product_name}
                className="w-full sm:w-40 h-40 object-cover rounded-xl bg-muted shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              {result.product ? (
                <>
                  <span className="inline-block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {result.product.category}
                  </span>
                  <h3 className="text-xl font-semibold text-foreground leading-tight">{result.product.product_name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.product.manufacturer} · Model {result.product.model_number}
                  </p>
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{result.product.product_description}</p>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-foreground leading-tight">Model {result.model_number}</h3>
                  <p className="text-sm text-muted-foreground mt-2">No product details in the database yet — an admin can add manuals, videos, and parts from the Product Database.</p>
                </>
              )}
              <Button onClick={handleAdd} disabled={adding} className="mt-4 h-11">
                {adding ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding…</>
                ) : (
                  <><PackagePlus className="w-4 h-4 mr-2" /> Add to my catalog</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}