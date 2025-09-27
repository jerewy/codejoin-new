"use client";

import { useEffect, useRef, useState } from "react";
import Router from "next/router";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Displays a small floating loader whenever the Next.js router
 * starts navigating to a different page. The existing layout is a
 * Client Component, so Next's built-in `loading.tsx` files never run
 * during client-side transitions. Listening to the router events lets
 * us surface feedback manually.
 */
export function RouteChangeIndicator() {
  const [isRouteChanging, setIsRouteChanging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleStart = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      setIsRouteChanging(true);
      setIsVisible(true);
    };

    const handleComplete = () => {
      hideTimerRef.current = setTimeout(() => {
        setIsRouteChanging(false);
        setIsVisible(false);
      }, 200);
    };

    Router.events.on("routeChangeStart", handleStart);
    Router.events.on("routeChangeComplete", handleComplete);
    Router.events.on("routeChangeError", handleComplete);

    return () => {
      Router.events.off("routeChangeStart", handleStart);
      Router.events.off("routeChangeComplete", handleComplete);
      Router.events.off("routeChangeError", handleComplete);

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      role="status"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-4 z-[9999] flex justify-center transition-opacity duration-200",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="flex items-center gap-2 rounded-full bg-background/80 px-4 py-2 shadow-lg ring-1 ring-border backdrop-blur">
        <Loader2
          aria-hidden
          className={cn(
            "h-4 w-4 text-primary transition-opacity",
            isRouteChanging ? "animate-spin opacity-100" : "opacity-0"
          )}
        />
        <span className="text-sm font-medium text-muted-foreground">
          Syncing your workspace…
        </span>
      </div>
    </div>
  );
}

