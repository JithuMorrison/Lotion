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
    <div className="overflow-auto px-4 pb-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Name</th>
            {props.map((p) => (
              <th key={p.id} className="px-3 py-2 font-medium">
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr
              key={entry.id}
              className="group border-b border-border hover:bg-muted/40"
            >
              <td className="px-3 py-1.5">
                <button
                  onClick={() => router.push(`/p/${entry.pageId}`)}
                  className="flex items-center gap-1.5 font-medium hover:underline"
                >
                  {entry.icon && <span>{entry.icon}</span>}
                  {entry.title || "Untitled"}
                  <ExternalLink className="size-3 opacity-0 group-hover:opacity-60" />
                </button>
              </td>
              {props.map((p) => (
                <td key={p.id} className="px-3 py-1.5">
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
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
