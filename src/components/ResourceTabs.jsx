import React, { useState } from "react";
import { FileText, Cable, Video, HelpCircle, Wrench, ShoppingCart, ExternalLink, Download, ChevronDown } from "lucide-react";

const TABS = [
  { key: "manuals", label: "Manuals", icon: FileText },
  { key: "wiring_diagrams", label: "Wiring Diagrams", icon: Cable },
  { key: "videos", label: "Videos", icon: Video },
  { key: "faqs", label: "FAQs", icon: HelpCircle },
  { key: "troubleshooting", label: "Troubleshooting", icon: Wrench },
  { key: "parts_links", label: "Parts Store", icon: ShoppingCart },
];

export default function ResourceTabs({ product }) {
  const available = TABS.filter((t) => Array.isArray(product[t.key]) && product[t.key].length > 0);
  const [active, setActive] = useState(available[0]?.key || "manuals");

  if (available.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        No resources are available for this product.
      </div>
    );
  }

  const current = available.find((t) => t.key === active) || available[0];
  const items = product[current.key];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 mb-6">
        {available.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
                {product[tab.key].length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[200px]">
        {current.key === "manuals" && <ManualList items={items} />}
        {current.key === "wiring_diagrams" && <DiagramList items={items} />}
        {current.key === "videos" && <VideoList items={items} />}
        {current.key === "faqs" && <FaqList items={items} />}
        {current.key === "troubleshooting" && <TroubleshootingList items={items} />}
        {current.key === "parts_links" && <PartsList items={items} />}
      </div>
    </div>
  );
}

function ManualList({ items }) {
  return (
    <div className="grid gap-3">
      {items.map((m, i) => (
        <a
          key={i}
          href={m.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
        >
          <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{m.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">{m.file_type || "PDF"} document</p>
          </div>
          <Download className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />
        </a>
      ))}
    </div>
  );
}

function DiagramList({ items }) {
  return (
    <div className="grid gap-3">
      {items.map((d, i) => (
        <a
          key={i}
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
        >
          <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Cable className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{d.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">Wiring diagram</p>
          </div>
          <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />
        </a>
      ))}
    </div>
  );
}

function VideoList({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((v, i) => (
        <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="group">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100">
            {v.thumbnail ? (
              <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="w-10 h-10 text-slate-300" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-900 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </div>
          </div>
          <p className="font-medium text-slate-900 mt-3 text-sm">{v.title}</p>
        </a>
      ))}
    </div>
  );
}

function FaqList({ items }) {
  return (
    <div className="grid gap-3">
      {items.map((f, i) => (
        <FaqItem key={i} faq={f} defaultOpen={i === 0} />
      ))}
    </div>
  );
}

function FaqItem({ faq, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-medium text-slate-900">{faq.question}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{faq.answer}</div>}
    </div>
  );
}

function TroubleshootingList({ items }) {
  return (
    <div className="grid gap-3">
      {items.map((t, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{t.problem}</p>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{t.solution}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PartsList({ items }) {
  return (
    <div className="grid gap-3">
      {items.map((p, i) => (
        <a
          key={i}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
        >
          <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{p.name}</p>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">Part #{p.part_number}</p>
          </div>
          {typeof p.price === "number" && (
            <span className="font-semibold text-slate-900 shrink-0">${p.price.toFixed(2)}</span>
          )}
          <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />
        </a>
      ))}
    </div>
  );
}