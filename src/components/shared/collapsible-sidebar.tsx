"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SidebarNav } from "@/components/shared/sidebar";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dmd-sidebar-collapsed";

export function CollapsibleSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) === "true";
    const raf = requestAnimationFrame(() => setCollapsed(stored));
    return () => cancelAnimationFrame(raf);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 transition-[width] duration-200 print:hidden md:block",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "fixed flex h-screen flex-col transition-[width] duration-200",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="min-h-0 flex-1">
          <SidebarNav collapsed={collapsed} />
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-10 items-center justify-center gap-2 border-t border-sidebar-border bg-sidebar text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <>
              <PanelLeftClose className="size-4" />
              <span className="text-xs font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
