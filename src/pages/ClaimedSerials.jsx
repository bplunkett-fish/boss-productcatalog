import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Hash, Search, Trash2, ShieldAlert, UserCircle, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import PullToRefresh from "@/components/PullToRefresh";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";

export default function ClaimedSerials() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/");
  };

  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "serial", dir: "asc" });
  const [pending, setPending] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [items, users, products] = await Promise.all([
        base44.entities.CatalogItem.list("-created_date", 500),
        base44.entities.User.list(),
        base44.entities.Product.list("-updated_date", 500)
      ]);
      const userMap = {};
      for (const u of users) userMap[u.id] = u;
      const productMap = {};
      for (const p of products) productMap[p.model_number] = p;
      setRows(items.map((i) => ({
        ...i,
        owner: userMap[i.created_by_id] || null,
        product: productMap[i.model_number] || null
      })));
    } catch (err) {
      setRows([]);
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
        <p className="text-sm text-muted-foreground mt-1">Claimed serials are managed by administrators.</p>
        <Button className="mt-6" onClick={goBack}><ArrowLeft className="w-4 h-4 mr-2" /> Back to catalog</Button>
      </div>
    );
  }

  const filtered = (rows || []).filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [r.serial_number, r.model_number, r.owner?.full_name, r.owner?.email]
      .some((v) => (v || "").toLowerCase().includes(q));
  });

  const SORT_KEYS = {
    serial: (r) => (r.serial_number || "").toLowerCase(),
    product: (r) => (r.product?.product_name || r.model_number || "").toLowerCase(),
    owner: (r) => (r.owner?.full_name || r.owner?.email || "").toLowerCase(),
    lastService: (r) => r.last_maintenance_date || "",
    due: (r) => r.maintenance_due_date || ""
  };

  const toggleSort = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const sorted = [...filtered].sort((a, b) => {
    const av = SORT_KEYS[sort.key](a);
    const bv = SORT_KEYS[sort.key](b);
    if (av < bv) return sort.dir === "asc" ? -1 : 1;
    if (av > bv) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  const confirmRemove = async () => {
    if (!pending) return;
    setRemoving(true);
    const previous = rows;
    setRows((prev) => (prev || []).filter((r) => r.id !== pending.id));
    try {
      await base44.entities.CatalogItem.delete(pending.id);
      toast({ title: "Serial removed", description: `${pending.serial_number} is now free to claim.` });
    } catch (err) {
      setRows(previous);
      toast({
        title: "Could not remove serial",
        description: err.response?.data?.error || err.message || "Something went wrong.",
        variant: "destructive"
      });
    } finally {
      setRemoving(false);
      setPending(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 md:top-14 z-10 bg-card/80 backdrop-blur-md border-b border-border pt-safe">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Hash className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-foreground">Claimed Serials</p>
              <p className="text-xs text-muted-foreground hidden sm:block">All serial numbers claimed by users</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hidden md:inline-flex" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to catalog
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-28 md:pb-12 space-y-8">
        <PullToRefresh onRefresh={load}>
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h2 className="text-xl font-semibold text-foreground">
                Claimed serials {rows && <span className="text-sm font-normal text-muted-foreground">({rows.length})</span>}
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search serial, model, or user…" className="pl-9 h-10 w-full sm:w-72" />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">{query ? "No matches found." : "No serials have been claimed yet."}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="hidden sm:grid grid-cols-[1.1fr_1.7fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/40">
                    <button onClick={() => toggleSort("serial")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors text-left">
                      Serial number
                      {sort.key === "serial" ? (sort.dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </button>
                    <button onClick={() => toggleSort("product")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors text-left">
                      Product
                      {sort.key === "product" ? (sort.dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </button>
                    <button onClick={() => toggleSort("owner")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors text-left">
                      Claimed by
                      {sort.key === "owner" ? (sort.dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </button>
                    <button onClick={() => toggleSort("lastService")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors text-left">
                      Last service
                      {sort.key === "lastService" ? (sort.dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </button>
                    <button onClick={() => toggleSort("due")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors text-left">
                      Next due
                      {sort.key === "due" ? (sort.dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </button>
                    <span />
                  </div>
                  <div className="divide-y divide-border">
                    {sorted.map((r) => (
                      <div key={r.id} className="grid grid-cols-1 sm:grid-cols-[1.1fr_1.7fr_1.5fr_1fr_1fr_auto] gap-2 sm:gap-4 px-4 sm:px-5 py-4 items-center">
                        <div className="font-mono text-sm font-medium text-foreground">{r.serial_number}</div>
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">{r.product?.product_name || "—"}</p>
                          {r.model_number && <p className="text-xs text-muted-foreground italic font-mono truncate">{r.model_number}</p>}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <UserCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">{r.owner?.full_name || "Unknown user"}</p>
                            <p className="text-xs text-muted-foreground truncate">{r.owner?.email || ""}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground sm:hidden">Last service</p>
                          <p className="text-sm font-mono text-foreground">{r.last_maintenance_date || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground sm:hidden">Next due</p>
                          <p className={`text-sm font-mono ${r.maintenance_due_date && new Date(r.maintenance_due_date + "T00:00:00") < today ? "text-destructive" : "text-foreground"}`}>{r.maintenance_due_date || "—"}</p>
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 min-h-11" onClick={() => setPending(r)} disabled={removing}>
                            <Trash2 className="w-4 h-4 sm:mr-1" /><span className="sm:inline">Remove</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </PullToRefresh>
      </main>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && !removing && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this serial?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <span className="font-mono font-medium text-foreground">{pending?.serial_number}</span> from {pending?.owner?.full_name || pending?.owner?.email || "this user"}&rsquo;s catalog. The serial number will be freed and available for anyone to claim again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} disabled={removing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Remove serial
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}