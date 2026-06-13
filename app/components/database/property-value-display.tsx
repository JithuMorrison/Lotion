"use client";

import { format } from "date-fns";
import { useUserStore } from "@/lib/stores";
import { colorClass } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/database/property-field";
import type { DateValue, PropertyDTO, PropertyValue } from "@/lib/types";

// Compact, read-only render of a property value for card faces and lists.
export function PropertyValueDisplay({
  property,
  value,
}: {
  property: PropertyDTO;
  value: PropertyValue;
}) {
  const users = useUserStore((s) => s.users);

  if (value === undefined || value === null || value === "") return null;

  switch (property.type) {
    case "select":
    case "status": {
      const opt = (property.options ?? []).find((o) => o.label === value);
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            colorClass(opt?.color)
          )}
        >
          {String(value)}
        </span>
      );
    }
    case "multi_select": {
      const arr = (value as string[]) ?? [];
      return (
        <span className="flex flex-wrap gap-1">
          {arr.map((label) => {
            const opt = (property.options ?? []).find((o) => o.label === label);
            return (
              <span
                key={label}
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  colorClass(opt?.color)
                )}
              >
                {label}
              </span>
            );
          })}
        </span>
      );
    }
    case "person": {
      const u = users.get(value as string);
      if (!u) return null;
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Avatar name={u.name} />
          {u.name}
        </span>
      );
    }
    case "date": {
      const d = value as DateValue;
      if (!d?.start) return null;
      const startLabel = safeFormat(d.start);
      const endLabel = d.end ? safeFormat(d.end) : null;
      return (
        <span className="text-xs text-muted-foreground">
          {startLabel}
          {endLabel && endLabel !== startLabel ? ` → ${endLabel}` : ""}
        </span>
      );
    }
    case "checkbox":
      return (
        <input type="checkbox" checked={!!value} readOnly className="size-3.5" />
      );
    case "url":
      return (
        <span className="truncate text-xs text-blue-600 underline">
          {String(value)}
        </span>
      );
    default:
      return (
        <span className="text-xs text-muted-foreground">{String(value)}</span>
      );
  }
}

function safeFormat(iso: string): string {
  try {
    return format(new Date(iso + "T00:00:00"), "MMM d");
  } catch {
    return iso;
  }
}
