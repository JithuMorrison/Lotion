"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  dateFnsLocalizer,
  type View,
} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { useCreateEntry, useUpdateEntry } from "@/lib/queries";
import { applyFilters } from "@/lib/values";
import type { DatabaseDTO, DateValue, EntryDTO, ViewDTO } from "@/lib/types";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date()),
  getDay,
  locales: { "en-US": enUS },
});

const DnDCalendar = withDragAndDrop<CalEvent>(Calendar);

interface CalEvent {
  id: string;
  pageId: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  entry: EntryDTO;
}

function toDate(iso: string): Date {
  // Parse a YYYY-MM-DD as a local date (avoid UTC shift).
  return new Date(iso + "T00:00:00");
}

function toISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function CalendarView({
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
  const [currentView, setCurrentView] = useState<View>("month");
  const [date, setDate] = useState(new Date(2026, 6, 1)); // default to July 2026 (seed data)
  const [error, setError] = useState<string | null>(null);

  const datePropId = view.config.datePropertyId;
  const dateProp = database.properties.find((p) => p.id === datePropId);

  const filtered = applyFilters(entries, view.config.filters);

  const events: CalEvent[] = useMemo(() => {
    if (!dateProp) return [];
    const result: CalEvent[] = [];
    for (const entry of filtered) {
      const v = entry.values[dateProp.id] as DateValue | undefined;
      if (!v?.start) continue;
      const start = toDate(v.start);
      const end = v.end ? toDate(v.end) : start;
      result.push({
        id: entry.id,
        pageId: entry.pageId,
        title: entry.title || "Untitled",
        start,
        end,
        allDay: true,
        entry,
      });
    }
    return result;
  }, [filtered, dateProp]);

  if (!dateProp) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        This calendar has no date property configured. Open view settings to
        pick a Date property.
      </div>
    );
  }

  const moveEvent = ({ event, start }: { event: CalEvent; start: Date | string }) => {
    const startDate = typeof start === "string" ? new Date(start) : start;
    const newStart = toISO(startDate);
    updateEntry.mutate(
      {
        entryId: event.id,
        values: { [dateProp.id]: { start: newStart, end: null } },
      },
      { onError: () => setError("Failed to reschedule — change reverted.") }
    );
  };

  const handleSelectSlot = async ({ start }: { start: Date }) => {
    await createEntry.mutateAsync({
      title: "Untitled",
      values: { [dateProp.id]: { start: toISO(start), end: null } },
    });
  };

  return (
    <div className="flex h-full flex-col px-4 pb-4">
      {error && (
        <div className="mb-2 rounded bg-red-50 px-3 py-1.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <DnDCalendar
          localizer={localizer}
          events={events}
          view={currentView}
          onView={(v) => setCurrentView(v)}
          date={date}
          onNavigate={(d) => setDate(d)}
          views={["month", "week"]}
          startAccessor="start"
          endAccessor="end"
          allDayAccessor="allDay"
          popup
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={(event) => router.push(`/p/${event.pageId}`)}
          onEventDrop={moveEvent}
          onEventResize={moveEvent}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
