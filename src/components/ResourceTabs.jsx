import React, { useState } from "react";
import { FileText, Cable, Video, HelpCircle, Wrench, ShoppingCart, ExternalLink, Download, ChevronDown, BookOpen } from "lucide-react";

const TABS = [
  { key: "manuals", label: "Manuals", icon: FileText },
  { key: "literature", label: "Literature", icon: BookOpen },
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
      <div className="text-center py-16 text-muted-foreground">
        No resources are available for this product.
      </div>
    );
  }

  const current = available.find((t) => t.key === active) || available[0];
  const items = product[current.key];

  return (
    <div>
      {/* Tab bar — horizontally scrollable on mobile, wraps on desktop */}
      <div className="flex md:flex-wrap gap-2 overflow-x-auto md:overflow-visible border-b border-border mb-6 -mx-1 px-1 pb-1 md:pb-0 md:mx-0 md:px-0">
        {available.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              aria-label={tab.label}
              aria-selected={isActive}
              role="tab"
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-md ${
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {product[tab.key].length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[200px]">
        {current.key === "manuals" && <ManualList items={items} />}
        {current.key === "literature" && <LiteratureList items={items} />}
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
          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-foreground/20 hover:bg-muted transition-colors group"
        >
          <div className="w-11 h-11 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{m.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{m.file_type || "PDF"} document</p>
          </div>
          <Download className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
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
          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-foreground/20 hover:bg-muted transition-colors group"
        >
          <div className="w-11 h-11 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Cable className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{d.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Wiring diagram</p>
          </div>
          <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
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
          <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
            {v.thumbnail ? (
              <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="w-10 h-10 text-muted-foreground/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                <svg className="w-6 h-6 text-foreground ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </div>
          </div>
          <p className="font-medium text-foreground mt-3 text-sm">{v.title}</p>
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
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="font-medium text-foreground">{faq.question}</span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.answer}</div>}
    </div>
  );
}

function TroubleshootingList({ items }) {
  return (
    <div className="grid gap-3">
      {items.map((t, i) => (
        <div key={i} className="rounded-xl border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">{t.problem}</p>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{t.solution}</p>
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
          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-foreground/20 hover:bg-muted transition-colors group"
        >
          <div className="w-11 h-11 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{p.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">Part #{p.part_number}</p>
          </div>
          {typeof p.price === "number" && (
            <span className="font-semibold text-foreground shrink-0">${p.price.toFixed(2)}</span>
          )}
          <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </a>
      ))}
    </div>
  );
}

function LiteratureList({ items }) {
  return (
    <div className="grid gap-3">
      {items.map((m, i) => (
        <a
          key={i}
          href={m.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-foreground/20 hover:bg-muted transition-colors group"
        >
          <div className="w-11 h-11 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{m.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{m.file_type || "Document"}</p>
          </div>
          <Download className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </a>
      ))}
    </div>
  );
}