import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRight, FileText, Cable, Video, HelpCircle, Wrench, ShoppingCart } from "lucide-react";

function countBadge(items) {
  return Array.isArray(items) ? items.length : 0;
}

export default function CatalogGrid({ items, onDelete, deletingId }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-20 px-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <PackageIcon />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Your catalog is empty</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
          Look up a product by serial number above and add it to start building your personal catalog.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((item) => (
        <div
          key={item.id}
          className="group rounded-2xl bg-white border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-200 flex flex-col"
        >
          <Link to={`/product/${item.id}`} className="block">
            <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.product_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PackageIcon />
                </div>
              )}
            </div>
          </Link>
          <div className="p-4 flex flex-col flex-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.category || "Product"}</span>
            <Link to={`/product/${item.id}`}>
              <h3 className="font-semibold text-slate-900 mt-1 leading-snug hover:underline">{item.product_name}</h3>
            </Link>
            <p className="text-xs text-slate-500 mt-1 font-mono">{item.serial_number}</p>

            <div className="flex flex-wrap gap-1.5 mt-3">
              <ResourceChip icon={FileText} count={countBadge(item.manuals)} label="Manuals" />
              <ResourceChip icon={Cable} count={countBadge(item.wiring_diagrams)} label="Diagrams" />
              <ResourceChip icon={Video} count={countBadge(item.videos)} label="Videos" />
              <ResourceChip icon={HelpCircle} count={countBadge(item.faqs)} label="FAQs" />
              <ResourceChip icon={Wrench} count={countBadge(item.troubleshooting)} label="Fixes" />
              <ResourceChip icon={ShoppingCart} count={countBadge(item.parts_links)} label="Parts" />
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
              <Button asChild size="sm" variant="default" className="flex-1">
                <Link to={`/product/${item.id}`}>
                  View details <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-slate-200"
                onClick={() => onDelete(item)}
                disabled={deletingId === item.id}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResourceChip({ icon: Icon, count, label }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
      <Icon className="w-3 h-3" />
      {count} {label}
    </span>
  );
}

function PackageIcon() {
  return (
    <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}