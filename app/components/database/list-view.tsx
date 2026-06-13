"use client";

import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { applyFilters, applySorts } from "@/lib/values";
import type { DatabaseDTO, EntryDTO, ViewDTO } from "@/lib/types";

// Minimal title-only list. No property columns by design.
export function ListView({
  entries,
  view,
}: {
  database: DatabaseDTO;
  entries: EntryDTO[];
  view: ViewDTO;
}) {
  const router = useRouter();
  const rows = applySorts(
    applyFilters(entries, view.config.filters),
    view.config.sorts
  );

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        No entries yet.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-4">
      {rows.map((entry) => (
        <button
          key={entry.id}
          onClick={() => router.push(`/p/${entry.pageId}`)}
          className="flex w-full items-center gap-2 border-b border-border px-2 py-2 text-left text-sm hover:bg-muted/40"
        >
          {entry.icon ? (
            <span>{entry.icon}</span>
          ) : (
            <FileText className="size-4 text-muted-foreground" />
          )}
          <span className="truncate">{entry.title || "Untitled"}</span>
        </button>
      ))}
    </div>
  );
}
