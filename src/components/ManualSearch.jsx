import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, PackagePlus, AlertCircle, ArrowLeft, Package } from "lucide-react";
import ResourceTabs from "@/components/ResourceTabs";

export default function ManualSearch({ onAdded }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);
  const [serial, setSerial] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    setSelected(null);
    setLoading(true);
    try {
      const all = await base44.entities.Product.list("-updated_date", 500);
      const q = query.trim().toLowerCase();
      const matches = !q
        ? all
        : all.filter((p) =>
            [p.model_number, p.product_name, p.category, p.manufacturer]
              .filter(Boolean)
              .some((v) => v.toLowerCase().includes(q))
          );
      setResults(matches);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selected || !serial.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await base44.functions.invoke("addProductToCatalog", {
        serial_number: serial.trim(),
        model_number: selected.model_number
      });
      const data = res.data;
      if (data.status === "already_claimed") {
        setError(data.message || "This serial number has already been added to another owner's catalog.");
      } else {
        setSerial("");
        setSelected(null);
        setResults(null);
        setQuery("");
        onAdded?.();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not add to catalog");
    } finally {
      setAdding(false);
    }
  };

  // Selected product detail view (read-only data + add form)
  if (selected) {
    return (
      <div className="w-full">
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to results
        </button>

        <div className="p-6 rounded-2xl bg-white border-2 border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-5">
            {selected.image_url && (
              <img
                src={selected.image_url}
                alt={selected.product_name}
                className="w-full sm:w-40 h-40 object-cover rounded-xl bg-slate-100 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                {selected.category}
              </span>
              <h3 className="text-xl font-semibold text-slate-900 leading-tight">{selected.product_name}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {selected.manufacturer} · Model {selected.model_number}
              </p>
              {selected.product_description && (
                <p className="text-sm text-slate-600 mt-3 leading-relaxed">{selected.product_description}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <ResourceTabs product={selected} />
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200">
            <label className="text-sm font-medium text-slate-700">Add to my catalog</label>
            <p className="text-xs text-slate-400 mt-0.5 mb-2">Enter the serial number of your unit to link it to this model.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="Serial number…"
                className="h-11 font-mono"
                disabled={adding}
              />
              <Button onClick={handleAdd} disabled={adding || !serial.trim()} className="h-11 px-6">
                {adding ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding…</>
                ) : (
                  <><PackagePlus className="w-4 h-4 mr-2" /> Add to catalog</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by model number, name, category, or manufacturer…"
            className="pl-12 h-14 text-base sm:text-lg bg-white border-2 border-slate-200 focus-visible:border-slate-900 transition-colors"
            disabled={loading}
          />
        </div>
        <Button type="submit" size="lg" className="h-14 px-8 text-base font-medium" disabled={loading}>
          {loading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Searching…</>
          ) : (
            <><Search className="w-5 h-5 mr-2" /> Search</>
          )}
        </Button>
      </form>

      {error && (
        <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {results && (
        <div className="mt-6">
          <p className="text-sm text-slate-500 mb-3">
            {results.length} {results.length === 1 ? "product" : "products"} found
          </p>
          {results.length === 0 ? (
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
              <p className="text-amber-800 font-medium">No products match your search</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="text-left p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-900 transition-colors flex gap-4"
                >
                  <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {p.category}
                    </span>
                    <p className="font-semibold text-slate-900 leading-tight truncate">{p.product_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{p.model_number}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}