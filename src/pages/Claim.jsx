import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, PackagePlus, AlertCircle, CheckCircle2, ArrowLeft, Package, QrCode } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function Claim() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const serial = (searchParams.get("serial") || "").trim();

  const [state, setState] = useState({ status: "loading" }); // loading | notfound | error | ready
  const [result, setResult] = useState(null);
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!serial) {
      setState({ status: "error", message: "No serial number was provided in the link." });
      return;
    }
    let cancelled = false;
    (async () => {
      setState({ status: "loading" });
      try {
        const res = await base44.functions.invoke("lookupProductBySerial", { serial_number: serial });
        if (cancelled) return;
        const data = res.data;
        setResult(data);
        setState({ status: data.found ? "ready" : "notfound" });
      } catch (err) {
        if (cancelled) return;
        setState({ status: "error", message: err.response?.data?.error || err.message || "Lookup failed" });
      }
    })();
    return () => { cancelled = true; };
  }, [serial]);

  const handleConfirm = async () => {
    if (!result?.found) return;
    setAdding(true);
    try {
      const res = await base44.functions.invoke("addProductToCatalog", {
        serial_number: result.serial_number,
        model_number: result.model_number,
      });
      const data = res.data;
      if (data.status === "already_claimed") {
        toast({ title: "Already claimed", description: data.message, variant: "destructive" });
      } else if (data.status === "already_in_catalog") {
        setDone(true);
        toast({ title: "Already in your catalog", description: "This product is already in your catalog." });
      } else {
        setDone(true);
        toast({ title: "Added to catalog", description: "The product has been added to your catalog." });
      }
    } catch (err) {
      toast({ title: "Could not add", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const goHome = () => navigate("/");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 md:top-14 z-10 bg-card/80 backdrop-blur-md border-b border-border pt-safe">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-foreground">Add to catalog</p>
              <p className="text-xs text-muted-foreground hidden sm:block">Scanned product</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={goHome} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Home
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-28 md:pb-12">
        {state.status === "loading" && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Looking up serial <span className="font-mono">{serial}</span>…</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-destructive mb-2" />
            <p className="font-medium text-destructive">{state.message}</p>
            <Button variant="outline" className="mt-5" onClick={goHome}>Back to home</Button>
          </div>
        )}

        {state.status === "notfound" && result && (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
            <p className="font-medium text-amber-700 dark:text-amber-300">
              No product found for serial <span className="font-mono">{result.serial_number}</span>
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">Check the QR code or enter the serial manually on the home page.</p>
            <Button variant="outline" className="mt-5" onClick={goHome}>Go to home</Button>
          </div>
        )}

        {state.status === "ready" && result && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Serial number</p>
            <p className="text-lg font-mono font-semibold text-foreground mb-5">{result.serial_number}</p>

            <div className="p-5 sm:p-6 rounded-2xl bg-card border-2 border-border shadow-sm">
              <div className="flex items-start gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Matched model <span className="font-mono">{result.model_number}</span>
                </span>
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
                      {result.product.product_description && (
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{result.product.product_description}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-semibold text-foreground leading-tight">Model {result.model_number}</h3>
                      <p className="text-sm text-muted-foreground mt-2">No product details in the database yet.</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {!done ? (
              <>
                <p className="text-sm text-muted-foreground mt-5 mb-3 text-center">
                  Please confirm this is the right product before adding it to your catalog.
                </p>
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <Button variant="outline" className="flex-1 min-h-11" onClick={goHome} disabled={adding}>
                    Cancel
                  </Button>
                  <Button className="flex-1 min-h-11" onClick={handleConfirm} disabled={adding}>
                    {adding ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding…</>
                    ) : (
                      <><PackagePlus className="w-4 h-4 mr-2" /> Confirm & add to catalog</>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-6 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                <p className="font-semibold text-foreground">Added to your catalog</p>
                <p className="text-sm text-muted-foreground mt-1">This product is now saved to your personal catalog.</p>
                <div className="flex flex-col sm:flex-row gap-3 mt-5 justify-center">
                  <Button asChild className="min-h-11">
                    <Link to="/"><Package className="w-4 h-4 mr-2" /> View my catalog</Link>
                  </Button>
                  {result.product && (
                    <Button asChild variant="outline" className="min-h-11">
                      <Link to={`/product/${result.catalog_id || ""}`} onClick={(e) => {
                        // Prefer navigating to the catalog item if we have its id; else home.
                      }}>View details</Link>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}