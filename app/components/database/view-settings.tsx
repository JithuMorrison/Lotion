"use client";

import { Trash2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useUpdateView } from "@/lib/queries";
import { useUserStore } from "@/lib/stores";
import type {
  DatabaseDTO,
  ViewConfig,
  ViewDTO,
  ViewFilter,
} from "@/lib/types";

export function ViewSettings({
  database,
  view,
  open,
  onClose,
}: {
  database: DatabaseDTO;
  view: ViewDTO;
  open: boolean;
  onClose: () => void;
}) {
  const updateView = useUpdateView(database.id);
  const users = useUserStore((s) => s.users);

  const patchConfig = (patch: Partial<ViewConfig>) => {
    updateView.mutate({
      viewId: view.id,
      config: { ...view.config, ...patch },
    });
  };

  const groupingProps = database.properties.filter(
    (p) => p.type === "select" || p.type === "status"
  );
  const dateProps = database.properties.filter((p) => p.type === "date");
  const filters = view.config.filters ?? [];

  const filterableProps = database.properties.filter((p) => p.type !== "title");

  const optionsForProp = (propertyId: string): string[] => {
    const prop = database.properties.find((p) => p.id === propertyId);
    if (!prop) return [];
    if (prop.type === "person") return Array.from(users.keys());
    return (prop.options ?? []).map((o) => o.label);
  };

  const labelForFilterValue = (
    propertyId: string,
    value: string
  ): string => {
    const prop = database.properties.find((p) => p.id === propertyId);
    if (prop?.type === "person") return users.get(value)?.name ?? value;
    return value;
  };

  const setFilter = (index: number, patch: Partial<ViewFilter>) => {
    const next = filters.map((f, i) => (i === index ? { ...f, ...patch } : f));
    patchConfig({ filters: next });
  };

  return (
    <Modal open={open} onClose={onClose} title="View settings" className="max-w-lg">
      <div className="space-y-4 text-sm">
        {(view.type === "kanban" || view.type === "timeline") && (
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Group by
            </label>
            <select
              value={view.config.groupingPropertyId ?? ""}
              onChange={(e) =>
                patchConfig({ groupingPropertyId: e.target.value })
              }
              className="w-full rounded border border-border bg-background px-2 py-1 outline-none"
            >
              <option value="">Select a property…</option>
              {groupingProps.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(view.type === "calendar" || view.type === "timeline") && (
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Date property
            </label>
            <select
              value={view.config.datePropertyId ?? ""}
              onChange={(e) => patchConfig({ datePropertyId: e.target.value })}
              className="w-full rounded border border-border bg-background px-2 py-1 outline-none"
            >
              <option value="">Select a date property…</option>
              {dateProps.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(view.type === "kanban" || view.type === "gallery") && (
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Visible card properties
            </label>
            <div className="space-y-1">
              {filterableProps.map((p) => {
                const checked = (view.config.visibleProperties ?? []).includes(
                  p.id
                );
                return (
                  <label key={p.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const cur = view.config.visibleProperties ?? [];
                        patchConfig({
                          visibleProperties: e.target.checked
                            ? [...cur, p.id]
                            : cur.filter((id) => id !== p.id),
                        });
                      }}
                      className="size-4 accent-primary"
                    />
                    {p.name}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Filters
          </label>
          <div className="space-y-2">
            {filters.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={f.propertyId}
                  onChange={(e) =>
                    setFilter(i, { propertyId: e.target.value, value: "" })
                  }
                  className="rounded border border-border bg-background px-1.5 py-1 outline-none"
                >
                  {filterableProps.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground">is</span>
                <select
                  value={String(f.value)}
                  onChange={(e) => setFilter(i, { value: e.target.value })}
                  className="flex-1 rounded border border-border bg-background px-1.5 py-1 outline-none"
                >
                  <option value="">Any</option>
                  {optionsForProp(f.propertyId).map((opt) => (
                    <option key={opt} value={opt}>
                      {labelForFilterValue(f.propertyId, opt)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    patchConfig({
                      filters: filters.filter((_, idx) => idx !== i),
                    })
                  }
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                patchConfig({
                  filters: [
                    ...filters,
                    {
                      propertyId: filterableProps[0]?.id ?? "",
                      value: "",
                    },
                  ],
                })
              }
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3.5" /> Add filter
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
