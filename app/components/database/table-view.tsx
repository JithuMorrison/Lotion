"use client";

import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { useUpdateEntry } from "@/lib/queries";
import { applyFilters, applySorts } from "@/lib/values";
import { PropertyField } from "@/components/database/property-field";
import type {
  DatabaseDTO,
  EntryDTO,
  PropertyValue,
  SelectOption,
  ViewDTO,
} from "@/lib/types";

export function TableView({
  database,
  entries,
  view,
}: {
  database: DatabaseDTO;
  entries: EntryDTO[];
  view: ViewDTO;
}) {
  const router = useRouter();
  const updateEntry = useUpdateEntry(database.id);

  const props = database.properties.filter((p) => p.type !== "title");
  const rows = applySorts(
    applyFilters(entries, view.config.filters),
    view.config.sorts
  );

  const setValue = (
    entry: EntryDTO,
    propertyId: string,
    value: PropertyValue
  ) => {
    updateEntry.mutate({ entryId: entry.id, values: { [propertyId]: value } });
  };

  const addOption = (propertyId: string, option: SelectOption) => {
    const prop = database.properties.find((p) => p.id === propertyId);
    if (!prop) return;
    const options = [...(prop.options ?? []), option];
    fetch(`/api/databases/${database.id}/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options }),
    });
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        No entries yet.
      </div>
    );
  }

  return (
    <div
      className="overflow-auto px-4 pb-4 min-h-[500px]"
      onMouseMove={(e) => e.stopPropagation()}
    >
      <div className="w-full border-collapse text-sm table">
        <div className="table-header-group">
          <div className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground table-row">
            <div className="px-3 py-2 font-medium table-cell">Name</div>
            {props.map((p) => (
              <div key={p.id} className="px-3 py-2 font-medium table-cell">
                {p.name}
              </div>
            ))}
          </div>
        </div>
        <div className="table-row-group">
          {rows.map((entry) => (
            <div
              key={entry.id}
              className="group border-b border-border hover:bg-muted/40 table-row"
            >
              <div className="px-3 py-1.5 table-cell">
                <button
                  onClick={() => router.push(`/p/${entry.pageId}`)}
                  className="flex items-center gap-1.5 font-medium hover:underline"
                >
                  {entry.icon && <span>{entry.icon}</span>}
                  {entry.title || "Untitled"}
                  <ExternalLink className="size-3 opacity-0 group-hover:opacity-60" />
                </button>
              </div>
              {props.map((p) => (
                <div key={p.id} className="px-3 py-1.5 table-cell">
                  <PropertyField
                    property={p}
                    value={entry.values[p.id]}
                    onChange={(v) => setValue(entry, p.id, v)}
                    onAddOption={
                      p.type === "select" ||
                      p.type === "multi_select" ||
                      p.type === "status"
                        ? (o) => addOption(p.id, o)
                        : undefined
                    }
                    compact
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
