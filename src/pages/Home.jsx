import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Package, LogOut } from "lucide-react";
import SerialLookup from "@/components/SerialLookup";
import CatalogGrid from "@/components/CatalogGrid";

export default function Home() {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const loadCatalog = useCallback(async () => {
    try {
      const list = await base44.entities.CatalogItem.list("-created_date", 100);
      setItems(list);
    } catch (err) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleDelete = async (item) => {
    setDeletingId(item.id);
    try {
      await base44.entities.CatalogItem.delete(item.id);
      setItems((prev) => (prev || []).filter((i) => i.id !== item.id));
    } catch (err) {
      // let it bubble visually
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-slate-900">PartsCatalog</p>
              <p className="text-xs text-slate-400 hidden sm:block">Product owner portal</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-slate-900">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero / lookup */}
        <section className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Look up a product
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            Enter a serial number to search your SAGE ERP. Found products can be added to your personal catalog with full manuals, diagrams, videos, and parts.
          </p>
          <div className="mt-6">
            <SerialLookup onAdded={loadCatalog} />
          </div>
        </section>

        {/* Catalog */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-slate-900">My catalog</h2>
            {items && items.length > 0 && (
              <span className="text-sm text-slate-400">{items.length} {items.length === 1 ? "product" : "products"}</span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
            </div>
          ) : (
            <CatalogGrid items={items || []} onDelete={handleDelete} deletingId={deletingId} />
          )}
        </section>
      </main>
    </div>
  );
}