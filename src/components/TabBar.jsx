import React, { useEffect, useRef } from "react";
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

  // Per-tab navigation stack: stores each tab's last location + scroll so
  // switching away and back restores where the user left off.
  const tabStateRef = useRef({}); // tabPath -> { pathname, search, scrollY }
  const pendingScrollRef = useRef(null); // scrollY to restore after a tab switch

  const activeTabFor = (pathname) => tabs.find((t) => t.match(pathname));

  // Track the active tab's current location as the user navigates within it,
  // and restore any pending scroll position after a tab switch completes.
  useEffect(() => {
    const active = activeTabFor(location.pathname);
    if (active) {
      const prev = tabStateRef.current[active.path];
      tabStateRef.current[active.path] = {
        pathname: location.pathname,
        search: location.search,
        scrollY: prev?.scrollY ?? 0,
      };
    }
    if (pendingScrollRef.current != null) {
      const y = pendingScrollRef.current;
      pendingScrollRef.current = null;
      // Defer past ScrollToTop's instant reset so the per-tab restore wins.
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [location.pathname, location.search]);

  const handleTab = (tab) => {
    const currentActive = activeTabFor(location.pathname);
    const isActive = currentActive?.path === tab.path;

    // Capture the outgoing tab's scroll before navigating away.
    const captureScroll = (t) => {
      if (!t) return;
      tabStateRef.current[t.path] = {
        ...tabStateRef.current[t.path],
        scrollY: window.scrollY,
      };
    };

    if (isActive) {
      // Re-tapping the active tab resets to its root only if not already there.
      const atRoot = location.pathname === tab.path && location.search === "";
      if (!atRoot) {
        captureScroll(currentActive);
        navigate(tab.path);
      }
      return;
    }

    // Switching to a different tab: restore its stored location, or go to
    // root on first visit.
    captureScroll(currentActive);
    const stored = tabStateRef.current[tab.path];
    if (stored) {
      pendingScrollRef.current = stored.scrollY ?? 0;
      navigate(stored.pathname + (stored.search || ""));
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