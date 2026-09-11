import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home as HomeIcon, Database, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

// Fixed bottom tab bar for mobile (md:hidden). Re-tapping the active tab
// returns to that tab's root. Desktop keeps the existing top-bar navigation.
export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const tabs = [
    { label: "Catalog", path: "/", icon: HomeIcon, match: (p) => p === "/" || p.startsWith("/product/") },
  ];
  if (user?.role === "admin") {
    tabs.push({ label: "Database", path: "/product-database", icon: Database, match: (p) => p.startsWith("/product-database") });
  }
  tabs.push({ label: "Settings", path: "/settings", icon: SettingsIcon, match: (p) => p.startsWith("/settings") });

  const handleTab = (tab) => {
    const active = tab.match(location.pathname);
    // Re-tapping the active tab (or returning to it from a sub-view) goes to root.
    if (active && location.pathname !== tab.path) {
      navigate(tab.path);
    } else if (active) {
      navigate(tab.path);
    } else {
      navigate(tab.path);
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border pb-safe">
      <div className="flex items-stretch justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(location.pathname);
          return (
            <button
              key={tab.path}
              onClick={() => handleTab(tab)}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}