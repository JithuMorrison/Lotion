"use client";

import { useRouter } from "next/navigation";
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  max,
  min,
} from "date-fns";
import { applyFilters } from "@/lib/values";
import { cn } from "@/lib/utils";
import { colorClass } from "@/lib/colors";
import type { DatabaseDTO, DateValue, EntryDTO, ViewDTO } from "@/lib/types";

// Lightweight Gantt-style timeline positioned by the first Date property.
export function TimelineView({
  database,
  entries,
  view,
}: {
  database: DatabaseDTO;
  entries: EntryDTO[];
  view: ViewDTO;
}) {
  const router = useRouter();
  const dateProp =
    database.properties.find((p) => p.id === view.config.datePropertyId) ??
    database.properties.find((p) => p.type === "date");

  if (!dateProp) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Timeline needs a Date property.
      </div>
    );
  }

  const filtered = applyFilters(entries, view.config.filters);
  const items = filtered
    .map((e) => {
      const v = e.values[dateProp.id] as DateValue | undefined;
      if (!v?.start) return null;
      const start = new Date(v.start + "T00:00:00");
      const end = new Date((v.end ?? v.start) + "T00:00:00");
      return { entry: e, start, end };
    })
    .filter((x): x is { entry: EntryDTO; start: Date; end: Date } => x !== null);

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        No dated entries to show on the timeline.
      </div>
    );
  }

  const rangeStart = min(items.map((i) => i.start));
  const rangeEnd = max(items.map((i) => i.end));
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const totalDays = days.length;
  const colWidth = 36;

  const groupingColor = (entry: EntryDTO) => {
    const statusProp = database.properties.find(
      (p) => p.type === "status" || p.type === "select"
    );
    if (!statusProp) return "blue";
    const val = entry.values[statusProp.id] as string;
    return (
      (statusProp.options ?? []).find((o) => o.label === val)?.color ?? "blue"
    );
  };

  return (
    <div className="overflow-auto px-4 pb-4">
      <div style={{ width: totalDays * colWidth + 200 }}>
        <div className="flex border-b border-border pl-[200px]">
          {days.map((d) => (
            <div
              key={d.toISOString()}
              style={{ width: colWidth }}
              className="shrink-0 py-1 text-center text-[10px] text-muted-foreground"
            >
              {format(d, "d")}
            </div>
          ))}
        </div>
        {items.map(({ entry, start, end }) => {
          const offset = differenceInCalendarDays(start, rangeStart);
          const span = differenceInCalendarDays(end, start) + 1;
          return (
            <div key={entry.id} className="flex items-center border-b border-border/50">
              <div className="w-[200px] shrink-0 truncate py-1.5 pr-2 text-sm">
                {entry.title || "Untitled"}
              </div>
              <div className="relative flex-1 py-1.5" style={{ height: 32 }}>
                <button
                  onClick={() => router.push(`/p/${entry.pageId}`)}
                  className={cn(
                    "absolute top-1.5 h-6 rounded px-2 text-xs font-medium",
                    colorClass(groupingColor(entry))
                  )}
                  style={{ left: offset * colWidth, width: span * colWidth - 4 }}
                >
                  <span className="truncate">{entry.title}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
