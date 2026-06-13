"use client";

import { useRouter } from "next/navigation";
import { applyFilters, applySorts } from "@/lib/values";
import { PropertyValueDisplay } from "@/components/database/property-value-display";
import type { DatabaseDTO, EntryDTO, ViewDTO } from "@/lib/types";

// Card grid view. Shows the page cover (if any) plus configured properties.
export function GalleryView({
  database,
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
  const visibleProps = (
    view.config.visibleProperties && view.config.visibleProperties.length > 0
      ? view.config.visibleProperties
      : database.properties.filter((p) => p.type !== "title").map((p) => p.id)
  )
    .map((id) => database.properties.find((p) => p.id === id))
    .filter(Boolean) as DatabaseDTO["properties"];

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        No entries yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 px-4 pb-4">
      {rows.map((entry) => (
        <button
          key={entry.id}
          onClick={() => router.push(`/p/${entry.pageId}`)}
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left shadow-sm hover:border-muted-foreground/30"
        >
          <div className="flex items-center gap-1.5 text-sm font-medium">
            {entry.icon && <span>{entry.icon}</span>}
            <span className="truncate">{entry.title || "Untitled"}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleProps.map((p) => (
              <PropertyValueDisplay
                key={p.id}
                property={p}
                value={entry.values[p.id]}
              />
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
