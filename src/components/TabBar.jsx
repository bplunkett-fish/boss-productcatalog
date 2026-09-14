import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home as HomeIcon, Database, Settings as SettingsIcon, Hash } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "tabBarStack";

// Shared in-memory stack so the desktop top nav and mobile bottom bar control
// the same per-tab history/scroll state.
const sharedTabState = { current: {} }; // tabPath -> { pathname, search, scrollY }
const sharedPendingScroll = { current: null }; // scrollY to restore after a tab switch

function buildTabs(user) {
  const tabs = [
    { label: "Catalog", path: "/", icon: HomeIcon, match: (p) => p === "/" || p.startsWith("/product/") },
  ];
  if (user?.role === "admin") {
    tabs.push({ label: "Database", path: "/product-database", icon: Database, match: (p) => p.startsWith("/product-database") });
    tabs.push({ label: "Serials", path: "/claimed-serials", icon: Hash, match: (p) => p.startsWith("/claimed-serials") });
  }
  tabs.push({ label: "Settings", path: "/settings", icon: SettingsIcon, match: (p) => p.startsWith("/settings") });
  return tabs;
}

// Shared navigation logic for both the desktop top nav and the mobile bottom bar.
function useTabBarLogic() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const tabs = buildTabs(user);

  const activeTabFor = (pathname) => tabs.find((t) => t.match(pathname));

  const handleTab = (tab) => {
    const currentActive = activeTabFor(location.pathname);
    const isActive = currentActive?.path === tab.path;

    // Capture the outgoing tab's scroll before navigating away.
    const captureScroll = (t) => {
      if (!t) return;
      sharedTabState.current[t.path] = {
        ...sharedTabState.current[t.path],
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
    const stored = sharedTabState.current[tab.path];
    if (stored) {
      sharedPendingScroll.current = stored.scrollY ?? 0;
      navigate(stored.pathname + (stored.search || ""));
    } else {
      navigate(tab.path);
    }
  };

  return { tabs, handleTab, location, activeTabFor };
}

// Desktop sticky top nav (md+). Mirrors the mobile bottom bar for navigation
// parity in desktop WebViews.
export function DesktopNav() {
  const { tabs, handleTab, location } = useTabBarLogic();
  return (
    <nav className="hidden md:flex sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border pt-safe">
      <div className="max-w-6xl mx-auto w-full px-6 h-14 flex items-center gap-1">
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
                "inline-flex items-center gap-2 px-3 h-10 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Fixed bottom tab bar for mobile (md:hidden). Re-tapping the active tab
// returns to that tab's root. The per-tab stack is persisted to sessionStorage
// so a reload preserves each tab's history and scroll position.
export default function TabBar() {
  const { tabs, handleTab, location, activeTabFor } = useTabBarLogic();

  // Restore the persisted stack on mount.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) sharedTabState.current = JSON.parse(saved) || {};
    } catch {}
  }, []);

  // Track the active tab's current location as the user navigates within it,
  // persist the stack, and restore any pending scroll position after a tab
  // switch completes.
  useEffect(() => {
    const active = activeTabFor(location.pathname);
    if (active) {
      const prev = sharedTabState.current[active.path];
      sharedTabState.current[active.path] = {
        pathname: location.pathname,
        search: location.search,
        scrollY: prev?.scrollY ?? 0,
      };
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sharedTabState.current));
    } catch {}
    if (sharedPendingScroll.current != null) {
      const y = sharedPendingScroll.current;
      sharedPendingScroll.current = null;
      // Defer past ScrollToTop's instant reset so the per-tab restore wins.
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [location.pathname, location.search]);

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