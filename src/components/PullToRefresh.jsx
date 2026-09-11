import React, { useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";

// Native-style pull-to-refresh for scroll areas. Listens to touch events on
// the wrapped content; only activates when the page is scrolled to the very
// top so it never fights the sticky header or tab bar.
export default function PullToRefresh({ onRefresh, children }) {
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = (e) => {
    if (window.scrollY > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  };

  const onTouchMove = (e) => {
    if (!pulling.current || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY <= 0) {
      const max = 80;
      // Elastic resistance: pull distance grows progressively slower as it
      // approaches the maximum, for a native rubber-band feel.
      const resisted = max * (1 - Math.exp(-delta / (max * 0.8)));
      setDistance(Math.min(resisted, max));
    } else if (delta <= 0) {
      setDistance(0);
    }
  };

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (distance > 55) {
      setRefreshing(true);
      setDistance(40);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
        setDistance(0);
      }
    } else {
      setDistance(0);
    }
  }, [distance, onRefresh]);

  const show = distance > 0 || refreshing;
  const animating = !pulling.current && !refreshing;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      <div
        className="overflow-hidden"
        style={{
          height: Math.max(distance, 0),
          transition: animating ? "height 150ms ease-out" : "none",
        }}
      >
        <div
          className="flex items-center justify-center select-none"
          style={{
            height: 40,
            transform: `translateY(${Math.max(distance - 40, -40)}px)`,
            transition: animating ? "transform 150ms ease-out" : "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
          }}
        >
          {show && (
            <Loader2 className={`w-5 h-5 text-muted-foreground ${refreshing || distance > 45 ? "animate-spin" : ""}`} />
          )}
        </div>
      </div>
      {children}
    </div>
  );
}