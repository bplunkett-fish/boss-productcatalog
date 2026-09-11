import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import ResourceTabs from "@/components/ResourceTabs";

export default function ProductDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const record = await base44.entities.CatalogItem.get(id);
        setItem(record);
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-semibold text-slate-900">Product not found</p>
        <p className="text-sm text-slate-500 mt-1">This item may have been removed from your catalog.</p>
        <Button asChild className="mt-6">
          <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back to catalog</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back to catalog</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Product header */}
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          <div className="w-full sm:w-56 h-56 rounded-2xl bg-slate-100 overflow-hidden shrink-0">
            {item.image_url ? (
              <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-12 h-12 text-slate-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {item.category || "Product"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
              {item.product_name}
            </h1>
            <p className="text-slate-500 mt-2">{item.manufacturer} · Model {item.model_number}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5">
              <DetailField label="Serial number" value={item.serial_number} mono />
              <DetailField label="Model" value={item.model_number} mono />
              <DetailField label="Category" value={item.category} />
            </div>

            {item.product_description && (
              <p className="text-sm text-slate-600 mt-5 leading-relaxed max-w-2xl">{item.product_description}</p>
            )}
          </div>
        </div>

        {/* Resources */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">Resources</h2>
          <ResourceTabs product={item} />
        </div>
      </main>
    </div>
  );
}

function DetailField({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-sm text-slate-900 mt-0.5 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );
}