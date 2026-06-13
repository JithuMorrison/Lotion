"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";
import { PanelLeft } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          "shrink-0 border-r border-border bg-sidebar transition-all duration-200",
          collapsed ? "w-0 overflow-hidden" : "w-64"
        )}
      >
        <Sidebar onToggle={() => setCollapsed(true)} />
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute left-3 top-3 z-10 rounded p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="size-4" />
          </button>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
