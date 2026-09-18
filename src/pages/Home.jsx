import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Database, Settings as SettingsIcon } from "lucide-react";
import SerialLookup from "@/components/SerialLookup";
import ManualSearch from "@/components/ManualSearch";
import CatalogGrid from "@/components/CatalogGrid";
import MaintenanceDueBanner from "@/components/MaintenanceDueBanner";
import PullToRefresh from "@/components/PullToRefresh";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import NotificationBell from "@/components/NotificationBell";

export default function Home() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(() => searchParams.get("detail") ? "manual" : "serial");

  const loadCatalog = useCallback(async () => {
    try {
      // Fetch the catalog and the product database in parallel, then join by
      // model_number client-side.
      const [list, products] = await Promise.all([
      base44.entities.CatalogItem.filter({ created_by_id: user?.id }, "-created_date", 100),
      base44.entities.Product.list("-updated_date", 200)]
      );
      const productMap = {};
      for (const p of products) productMap[p.model_number] = p;
      setItems(list.map((i) => ({ ...i, product: productMap[i.model_number] || null })));
    } catch (err) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Optimistic delete: remove immediately, restore with a toast on failure.
  const handleDelete = async (item) => {
    const previous = items;
    setItems((prev) => (prev || []).filter((i) => i.id !== item.id));
    try {
      await base44.entities.CatalogItem.delete(item.id);
    } catch (err) {
      setItems(previous);
      toast({
        title: "Could not delete item",
        description: err.response?.data?.error || err.message || "Something went wrong. The item was restored.",
        variant: "destructive"
      });
    }
  };

  // Handles optimistic add-to-catalog events from SerialLookup / ManualSearch:
  // insert a pending placeholder immediately, reconcile (reload) on commit,
  // or remove the placeholder on rollback (e.g. already_claimed).
  const handleCatalogEvent = useCallback((event) => {
    if (!event || typeof event !== "object") {loadCatalog();return;}
    if (event.type === "optimistic_add") {
      setItems((prev) => [event.item, ...(prev || [])]);
    } else if (event.type === "optimistic_rollback") {
      setItems((prev) => (prev || []).filter((i) => i.id !== event.id));
    } else if (event.type === "optimistic_commit") {
      loadCatalog();
    }
  }, [loadCatalog]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 md:top-14 z-10 bg-card/80 backdrop-blur-md border-b border-border pt-safe">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary shrink-0">
              <img src="https://media.base44.com/images/public/6aa405b709b2a9584afa1b84/4bb03db4b_app-logo-square.png" alt="PartsCatalog" className="w-full h-full object-cover" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-foreground">Product Catalog</p>
              <p className="text-xs text-muted-foreground hidden sm:block">Product owner portal</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="md:hidden"><NotificationBell /></div>
            {user?.role === "admin" &&
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hidden md:inline-flex">
                <Link to="/product-database"><Database className="w-4 h-4 mr-2" /> Product database</Link>
              </Button>
            }
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hidden md:inline-flex" aria-label="Settings">
              <Link to="/settings"><SettingsIcon className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Settings</span></Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground hidden md:inline-flex" aria-label="Sign out">
              <LogOut className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-28 md:pb-12">
        {/* Maintenance due alert */}
        {items && items.length > 0 && (
          <div className="mb-6">
            <MaintenanceDueBanner items={items} />
          </div>
        )}

        {/* Hero / lookup */}
        <section className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Look up a product
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Look up a product by serial number, or search the product database by model to view its manuals, diagrams, videos, and parts — then add it to your personal catalog.
          </p>

          {/* Mode toggle */}
          <div className="mt-6 inline-flex p-1 rounded-xl bg-muted border border-border">
            <button
              onClick={() => setMode("serial")}
              aria-pressed={mode === "serial"}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              mode === "serial" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`
              }>
              
              Serial lookup
            </button>
            <button
              onClick={() => setMode("manual")}
              aria-pressed={mode === "manual"}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              mode === "manual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`
              }>
              
              Manual search
            </button>
          </div>

          <div className="mt-6">
            {mode === "serial" ?
            <SerialLookup onAdded={handleCatalogEvent} /> :

            <ManualSearch onAdded={handleCatalogEvent} />
            }
          </div>
        </section>

        {/* Catalog */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-foreground">My catalog</h2>
            {items && items.length > 0 &&
            <span className="text-sm text-muted-foreground">{items.length} {items.length === 1 ? "product" : "products"}</span>
            }
          </div>

          {loading ?
          <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            </div> :

          <PullToRefresh onRefresh={loadCatalog}>
              <CatalogGrid items={items || []} onDelete={handleDelete} />
            </PullToRefresh>
          }
        </section>
      </main>
    </div>);

}