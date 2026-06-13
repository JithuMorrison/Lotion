"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus, EyeOff } from "lucide-react";
import {
  useCreateEntry,
  useDuplicateEntry,
  useUpdateEntry,
  useUpdateView,
} from "@/lib/queries";
import { applyFilters, applySorts } from "@/lib/values";
import { colorClass } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { PropertyValueDisplay } from "@/components/database/property-value-display";
import { TemplatePicker } from "@/components/database/template-picker";
import type { DatabaseDTO, EntryDTO, ViewDTO } from "@/lib/types";

export function KanbanView({
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
  const createEntry = useCreateEntry(database.id);
  const duplicateEntry = useDuplicateEntry(database.id);
  const updateView = useUpdateView(database.id);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickerColumn, setPickerColumn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const groupingId = view.config.groupingPropertyId;
  const groupingProp = database.properties.find((p) => p.id === groupingId);

  if (!groupingProp) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        This board has no grouping property configured. Open view settings to
        pick a Select or Status property.
      </div>
    );
  }

  const hiddenGroups = view.config.hiddenGroups ?? [];
  const filtered = applyFilters(entries, view.config.filters);
  const visibleProps = (view.config.visibleProperties ?? [])
    .map((id) => database.properties.find((p) => p.id === id))
    .filter(Boolean) as DatabaseDTO["properties"];

  const options = groupingProp.options ?? [];
  const columns = options.filter((o) => !hiddenGroups.includes(o.label));

  const entriesFor = (label: string) =>
    applySorts(
      filtered.filter((e) => e.values[groupingProp.id] === label),
      view.config.sorts
    );

  const activeEntry = filtered.find((e) => e.id === activeId) ?? null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id ? String(e.over.id) : null;
    const entryId = String(e.active.id);
    if (!overId) return;
    const entry = filtered.find((x) => x.id === entryId);
    if (!entry || entry.values[groupingProp.id] === overId) return;
    updateEntry.mutate(
      {
        entryId,
        values: { [groupingProp.id]: overId },
        autoCreateOptions: true,
      },
      {
        onError: () => setError("Failed to move card — change reverted."),
      }
    );
  };

  const hideColumn = (label: string) => {
    updateView.mutate({
      viewId: view.id,
      config: { ...view.config, hiddenGroups: [...hiddenGroups, label] },
    });
  };

  const handleAdd = (columnLabel: string) => {
    // Show template picker first; the picker offers a blank option too.
    setPickerColumn(columnLabel);
  };

  const createInColumn = async (
    columnLabel: string,
    templateId: string | null
  ) => {
    const presetValues = { [groupingProp.id]: columnLabel };
    if (templateId) {
      await duplicateEntry.mutateAsync({ entryId: templateId, values: presetValues });
    } else {
      await createEntry.mutateAsync({ title: "Untitled", values: presetValues });
    }
    setPickerColumn(null);
  };

  return (
    <div className="flex h-full flex-col">
      {error && (
        <div className="mx-4 mb-2 rounded bg-red-50 px-3 py-1.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {hiddenGroups.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-2 text-xs text-muted-foreground">
          <span>Hidden:</span>
          {hiddenGroups.map((label) => (
            <button
              key={label}
              onClick={() =>
                updateView.mutate({
                  viewId: view.id,
                  config: {
                    ...view.config,
                    hiddenGroups: hiddenGroups.filter((l) => l !== label),
                  },
                })
              }
              className="rounded bg-muted px-2 py-0.5 hover:bg-muted/70"
            >
              {label} ✕
            </button>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No entries yet. Click + in a column to create one.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex flex-1 gap-3 overflow-x-auto px-4 pb-4">
            {columns.map((option) => (
              <KanbanColumn
                key={option.label}
                label={option.label}
                color={option.color}
                count={entriesFor(option.label).length}
                onAdd={() => handleAdd(option.label)}
                onHide={() => hideColumn(option.label)}
              >
                {entriesFor(option.label).map((entry) => (
                  <KanbanCard
                    key={entry.id}
                    entry={entry}
                    visibleProps={visibleProps}
                    onClick={() => router.push(`/p/${entry.pageId}`)}
                  />
                ))}
              </KanbanColumn>
            ))}
          </div>

          <DragOverlay>
            {activeEntry ? (
              <div className="w-64 rotate-2 rounded-lg border border-border bg-card p-3 shadow-lg">
                <div className="text-sm font-medium">{activeEntry.title}</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {pickerColumn !== null && (
        <TemplatePicker
          databaseId={database.id}
          open
          onClose={() => setPickerColumn(null)}
          onPick={(templateId) => createInColumn(pickerColumn, templateId)}
        />
      )}
    </div>
  );
}

function KanbanColumn({
  label,
  color,
  count,
  onAdd,
  onHide,
  children,
}: {
  label: string;
  color: string;
  count: number;
  onAdd: () => void;
  onHide: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: label });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
            colorClass(color)
          )}
        >
          {label}
          <span className="opacity-60">{count}</span>
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onHide}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Hide column"
          >
            <EyeOff className="size-3.5" />
          </button>
          <button
            onClick={onAdd}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Add card"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-lg p-1.5 transition-colors",
          isOver ? "bg-muted" : "bg-muted/40"
        )}
      >
        {children}
        <button
          onClick={onAdd}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          <Plus className="size-3.5" /> New
        </button>
      </div>
    </div>
  );
}

function KanbanCard({
  entry,
  visibleProps,
  onClick,
}: {
  entry: EntryDTO;
  visibleProps: DatabaseDTO["properties"];
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: entry.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm hover:border-muted-foreground/30",
        isDragging && "opacity-30"
      )}
    >
      <div className="mb-1 flex items-center gap-1.5 text-sm font-medium">
        {entry.icon && <span>{entry.icon}</span>}
        <span className="truncate">{entry.title || "Untitled"}</span>
      </div>
      {visibleProps.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {visibleProps.map((p) => (
            <PropertyValueDisplay
              key={p.id}
              property={p}
              value={entry.values[p.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
