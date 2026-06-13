import type {
  EntryDTO,
  PropertyValue,
  ViewFilter,
  ViewSort,
} from "@/lib/types";

// Apply view filters client-side (equality match on a property value).
export function applyFilters(
  entries: EntryDTO[],
  filters: ViewFilter[] | undefined
): EntryDTO[] {
  if (!filters || filters.length === 0) return entries;
  return entries.filter((entry) =>
    filters.every((f) => {
      const v = entry.values[f.propertyId];
      if (Array.isArray(v)) return v.includes(f.value as string);
      return v === f.value;
    })
  );
}

function compare(a: PropertyValue, b: PropertyValue): number {
  if (a === undefined || a === null || a === "") return 1;
  if (b === undefined || b === null || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function applySorts(
  entries: EntryDTO[],
  sorts: ViewSort[] | undefined
): EntryDTO[] {
  if (!sorts || sorts.length === 0) return entries;
  const copy = [...entries];
  copy.sort((ea, eb) => {
    for (const s of sorts) {
      const result = compare(ea.values[s.propertyId], eb.values[s.propertyId]);
      if (result !== 0) return s.direction === "desc" ? -result : result;
    }
    return 0;
  });
  return copy;
}
