"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Star } from "lucide-react";
import { api } from "@/lib/api";
import { useDatabase, useUpdateEntry } from "@/lib/queries";
import { PropertyField } from "@/components/database/property-field";
import { ApiError } from "@/lib/api";
import type { EntryDTO, PropertyValue, SelectOption } from "@/lib/types";

// Inline property editor shown at the top of a database entry's page.
export function EntryProperties({
  entryId,
  databaseId,
}: {
  entryId: string;
  databaseId: string;
}) {
  const { data: database } = useDatabase(databaseId);
  const { data: entry, refetch } = useQuery({
    queryKey: ["entry", entryId],
    queryFn: () =>
      api.get<EntryDTO>(`/api/databases/${databaseId}/entries/${entryId}`),
  });
  const updateEntry = useUpdateEntry(databaseId);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!database || !entry) return null;

  const editableProps = database.properties.filter((p) => p.type !== "title");

  const setValue = (propertyId: string, value: PropertyValue) => {
    setError(null);
    updateEntry.mutate(
      { entryId, values: { [propertyId]: value } },
      {
        onError: (err) => {
          if (err instanceof ApiError && err.status === 422) {
            setError(err.message);
          } else {
            setError("Failed to save change.");
          }
          refetch();
        },
        onSuccess: () => refetch(),
      }
    );
  };

  const addOption = async (propertyId: string, option: SelectOption) => {
    const prop = database.properties.find((p) => p.id === propertyId);
    if (!prop) return;
    const options = [...(prop.options ?? []), option];
    await api.patch(
      `/api/databases/${databaseId}/properties/${propertyId}`,
      { options }
    );
  };

  const toggleTemplate = () => {
    updateEntry.mutate(
      { entryId, isTemplate: !entry.isTemplate },
      { onSuccess: () => refetch() }
    );
    setMenuOpen(false);
  };

  return (
    <div className="mx-auto mt-4 max-w-4xl px-14">
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Properties
          </span>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="Entry actions"
            >
              <MoreHorizontal className="size-4" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-40 mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
                  <button
                    onClick={toggleTemplate}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Star className="size-3.5" />
                    {entry.isTemplate
                      ? "Remove from templates"
                      : "Save as template"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {entry.isTemplate && (
          <div className="mb-2 inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
            <Star className="size-3" /> Template
          </div>
        )}

        <div className="grid gap-2">
          {editableProps.map((p) => (
            <div key={p.id} className="grid grid-cols-[160px_1fr] items-center gap-2">
              <span className="text-sm text-muted-foreground">{p.name}</span>
              <PropertyField
                property={p}
                value={entry.values[p.id]}
                onChange={(v) => setValue(p.id, v)}
                onAddOption={
                  p.type === "select" ||
                  p.type === "multi_select" ||
                  p.type === "status"
                    ? (o) => addOption(p.id, o)
                    : undefined
                }
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
