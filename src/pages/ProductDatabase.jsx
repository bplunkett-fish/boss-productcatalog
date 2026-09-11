import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Plus, Trash2, Pencil, Search, Package, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import ProductEditor from "@/components/ProductEditor";
import ProductCsvImport from "@/components/ProductCsvImport";
import PullToRefresh from "@/components/PullToRefresh";

export default function ProductDatabase() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/");
  };
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center pb-28">
        <ShieldAlert className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-lg font-semibold text-foreground">Admins only</p>
        <p className="text-sm text-muted-foreground mt-1">The product database is managed by administrators.</p>
        <Button className="mt-6" onClick={goBack}><ArrowLeft className="w-4 h-4 mr-2" /> Back to catalog</Button>
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 md:top-14 z-10 bg-card/80 backdrop-blur-md border-b border-border pt-safe">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-foreground">Product Database</p>
              <p className="text-xs text-muted-foreground hidden sm:block">Model-level resources</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hidden md:inline-flex" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to catalog
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-28 md:pb-12 space-y-8">
        <section className="rounded-2xl border-2 border-dashed border-border bg-card p-5 sm:p-6">
          <ProductCsvImport />
        </section>

        <PullToRefresh onRefresh={load}>
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h2 className="text-xl font-semibold text-foreground">Models</h2>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models…" className="pl-9 h-10 w-full sm:w-64" />
              </div>
              <Button onClick={handleNew} className="h-10"><Plus className="w-4 h-4 mr-1" /> New model</Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No products in the database yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Add a model manually or import a CSV above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(p => (
                <div key={p.id} className="rounded-2xl bg-card border border-border overflow-hidden flex flex-col">
                  <div className="aspect-[4/3] bg-muted overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-muted-foreground/50" /></div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.category || "—"}</span>
                    <h3 className="font-semibold text-foreground mt-1">{p.product_name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{p.model_number} · {p.manufacturer || "—"}</p>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                      <Button size="sm" variant="outline" className="flex-1 min-h-11" onClick={() => handleEdit(p)} aria-label={`Edit ${p.product_name}`}>
                        <Pencil className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 h-11 w-11 sm:h-9 sm:w-9" onClick={() => handleDelete(p)} disabled={deletingId === p.id} aria-label={`Delete ${p.product_name}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        </PullToRefresh>
      </main>

      <ProductEditor open={editorOpen} product={editing} onClose={() => setEditorOpen(false)} onSave={handleSave} />
    </div>
  );
}