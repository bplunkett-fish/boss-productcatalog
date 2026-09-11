import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Plus, Trash2, Pencil, Search, Package, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import ProductEditor from "@/components/ProductEditor";
import ProductCsvImport from "@/components/ProductCsvImport";

export default function ProductDatabase() {
  const { user } = useAuth();
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await base44.entities.Product.list("-updated_date", 200);
      setProducts(list);
    } catch (err) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <ShieldAlert className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-lg font-semibold text-slate-900">Admins only</p>
        <p className="text-sm text-slate-500 mt-1">The product database is managed by administrators.</p>
        <Button asChild className="mt-6"><Link to="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back to catalog</Link></Button>
      </div>
    );
  }

  const filtered = (products || []).filter(p => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [p.model_number, p.product_name, p.category, p.manufacturer].some(v => (v || "").toLowerCase().includes(q));
  });

  const handleNew = () => { setEditing(null); setEditorOpen(true); };
  const handleEdit = (p) => { setEditing(p); setEditorOpen(true); };

  const handleSave = async (data) => {
    if (editing) {
      await base44.entities.Product.update(editing.id, data);
    } else {
      await base44.entities.Product.create(data);
    }
    setEditorOpen(false);
    await load();
  };

  const handleDelete = async (p) => {
    setDeletingId(p.id);
    try {
      await base44.entities.Product.delete(p.id);
      await load();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-slate-900">Product Database</p>
              <p className="text-xs text-slate-400 hidden sm:block">Model-level resources</p>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back to catalog</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <section className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-5 sm:p-6">
          <ProductCsvImport />
        </section>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h2 className="text-xl font-semibold text-slate-900">Models</h2>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models…" className="pl-9 h-10 w-full sm:w-64" />
              </div>
              <Button onClick={handleNew} className="h-10"><Plus className="w-4 h-4 mr-1" /> New model</Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500">No products in the database yet.</p>
              <p className="text-sm text-slate-400 mt-1">Add a model manually or import a CSV above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(p => (
                <div key={p.id} className="rounded-2xl bg-white border border-slate-200 overflow-hidden flex flex-col">
                  <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-slate-300" /></div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{p.category || "—"}</span>
                    <h3 className="font-semibold text-slate-900 mt-1">{p.product_name}</h3>
                    <p className="text-xs text-slate-500 mt-1 font-mono">{p.model_number} · {p.manufacturer || "—"}</p>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(p)}>
                        <Pencil className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(p)} disabled={deletingId === p.id}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <ProductEditor open={editorOpen} product={editing} onClose={() => setEditorOpen(false)} onSave={handleSave} />
    </div>
  );
}