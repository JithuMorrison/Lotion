"use client";

import { useState } from "react";
import {
  Plus,
  Settings2,
  SlidersHorizontal,
  LayoutGrid,
  Calendar as CalendarIcon,
  Table as TableIcon,
  List as ListIcon,
  Image as ImageIcon,
  GanttChart,
} from "lucide-react";
import {
  useDatabase,
  useEntries,
  useCreateView,
  useCreateEntry,
  useDuplicateEntry,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ErrorBoundary } from "@/components/editor/error-boundary";
import { KanbanView } from "@/components/database/kanban-view";
import { CalendarView } from "@/components/database/calendar-view";
import { TableView } from "@/components/database/table-view";
import { ListView } from "@/components/database/list-view";
import { GalleryView } from "@/components/database/gallery-view";
import { TimelineView } from "@/components/database/timeline-view";
import { PropertyPanel } from "@/components/database/property-panel";
import { ViewSettings } from "@/components/database/view-settings";
import { TemplatePicker } from "@/components/database/template-picker";
import { cn } from "@/lib/utils";
import type { ViewDTO, ViewType } from "@/lib/types";

const VIEW_TYPES: { type: ViewType; label: string; icon: typeof LayoutGrid }[] = [
  { type: "kanban", label: "Kanban", icon: LayoutGrid },
  { type: "calendar", label: "Calendar", icon: CalendarIcon },
  { type: "table", label: "Table", icon: TableIcon },
  { type: "list", label: "List", icon: ListIcon },
  { type: "gallery", label: "Gallery", icon: ImageIcon },
  { type: "timeline", label: "Timeline", icon: GanttChart },
];

export function DatabaseScreen({
  databaseId,
  embedded = false,
}: {
  databaseId: string;
  embedded?: boolean;
}) {
  const { data: database, isLoading } = useDatabase(databaseId);
  const { data: entries } = useEntries(databaseId);
  const createView = useCreateView(databaseId);
  const createEntry = useCreateEntry(databaseId);
  const duplicateEntry = useDuplicateEntry(databaseId);

  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [showProps, setShowProps] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddView, setShowAddView] = useState(false);
  const [showNewEntry, setShowNewEntry] = useState(false);

  if (isLoading || !database) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Loading database…</div>
    );
  }

  const activeView: ViewDTO | undefined =
    database.views.find((v) => v.id === activeViewId) ?? database.views[0];

  const addView = async (type: ViewType) => {
    const defaultConfig =
      type === "kanban"
        ? {
            groupingPropertyId: database.properties.find(
              (p) => p.type === "status" || p.type === "select"
            )?.id,
            visibleProperties: [],
            filters: [],
            sorts: [],
          }
        : type === "calendar" || type === "timeline"
          ? {
              datePropertyId: database.properties.find((p) => p.type === "date")
                ?.id,
              filters: [],
              sorts: [],
            }
          : { filters: [], sorts: [] };
    const created = await createView.mutateAsync({
      name: VIEW_TYPES.find((v) => v.type === type)?.label ?? type,
      type,
      config: defaultConfig,
    });
    setActiveViewId(created.id);
    setShowAddView(false);
  };

  const handleNewEntry = () => setShowNewEntry(true);

  const createEntryFromPicker = async (templateId: string | null) => {
    if (templateId) {
      await duplicateEntry.mutateAsync({ entryId: templateId });
    } else {
      await createEntry.mutateAsync({ title: "Untitled" });
    }
    setShowNewEntry(false);
  };

  const renderView = () => {
    if (!activeView) return null;
    const props = { database, entries: entries ?? [], view: activeView };
    switch (activeView.type) {
      case "kanban":
        return <KanbanView {...props} />;
      case "calendar":
        return <CalendarView {...props} />;
      case "table":
        return <TableView {...props} />;
      case "list":
        return <ListView {...props} />;
      case "gallery":
        return <GalleryView {...props} />;
      case "timeline":
        return <TimelineView {...props} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col",
        embedded
          ? "h-[560px] overflow-hidden rounded-lg border border-border"
          : "h-full"
      )}
    >
      {/* View tab bar + toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {database.views.map((v) => {
            const meta = VIEW_TYPES.find((t) => t.type === v.type);
            const Icon = meta?.icon ?? LayoutGrid;
            return (
              <button
                key={v.id}
                onClick={() => setActiveViewId(v.id)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-2 py-2.5 text-sm",
                  activeView?.id === v.id
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {v.name}
              </button>
            );
          })}
          <button
            onClick={() => setShowAddView(true)}
            className="flex items-center gap-1 px-2 py-2.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3.5" /> Add view
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowProps(true)}
          >
            <Settings2 className="size-4" /> Properties
          </Button>
          {activeView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <SlidersHorizontal className="size-4" /> View
            </Button>
          )}
          <Button size="sm" onClick={handleNewEntry}>
            <Plus className="size-4" /> New
          </Button>
        </div>
      </div>

      {/* Active view */}
      <div className="min-h-0 flex-1 pt-3">
        {database.views.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <p>No views yet.</p>
            <Button onClick={() => setShowAddView(true)}>
              <Plus className="size-4" /> Add a view
            </Button>
          </div>
        ) : (
          <ErrorBoundary>{renderView()}</ErrorBoundary>
        )}
      </div>

      <PropertyPanel
        database={database}
        open={showProps}
        onClose={() => setShowProps(false)}
      />
      {activeView && (
        <ViewSettings
          database={database}
          view={activeView}
          open={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Add view modal */}
      <Modal
        open={showAddView}
        onClose={() => setShowAddView(false)}
        title="Add a view"
      >
        <div className="grid grid-cols-3 gap-2">
          {VIEW_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => addView(type)}
              className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-sm hover:bg-muted"
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
      </Modal>

      <TemplatePicker
        databaseId={databaseId}
        open={showNewEntry}
        onClose={() => setShowNewEntry(false)}
        onPick={createEntryFromPicker}
      />
    </div>
  );
}
