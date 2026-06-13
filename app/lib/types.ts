// Shared domain types for the Notion clone.

export type PropertyType =
  | "title"
  | "select"
  | "multi_select"
  | "date"
  | "person"
  | "number"
  | "checkbox"
  | "url"
  | "status";

// Property types offered in the UI selector. Relation and Rollup are deferred to v2.
export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "title", label: "Title" },
  { value: "select", label: "Select" },
  { value: "multi_select", label: "Multi-Select" },
  { value: "date", label: "Date" },
  { value: "person", label: "Person" },
  { value: "number", label: "Number" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
  { value: "status", label: "Status" },
];

export const OPTION_COLORS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const;

export type OptionColor = (typeof OPTION_COLORS)[number];

export interface SelectOption {
  label: string;
  color: OptionColor | string;
}

export interface DateValue {
  start: string;
  end: string | null;
}

// A property's stored value depends on its type:
// - select/status: string (option label)
// - multi_select: string[]
// - date: DateValue
// - person: string (userId) | string[]
// - number: number
// - checkbox: boolean
// - url/title: string
export type PropertyValue =
  | string
  | string[]
  | number
  | boolean
  | DateValue
  | null;

export type EntryValues = Record<string, PropertyValue>;

export interface ViewFilter {
  propertyId: string;
  value: string | number | boolean;
}

export interface ViewSort {
  propertyId: string;
  direction: "asc" | "desc";
}

export interface ViewConfig {
  groupingPropertyId?: string;
  datePropertyId?: string;
  visibleProperties?: string[];
  hiddenGroups?: string[];
  filters?: ViewFilter[];
  sorts?: ViewSort[];
}

export type ViewType =
  | "kanban"
  | "calendar"
  | "table"
  | "list"
  | "gallery"
  | "timeline";

// Serialized shapes returned by the API.
export interface PageDTO {
  id: string;
  title: string;
  icon: string | null;
  coverUrl: string | null;
  blocksContent: unknown;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  isDatabase?: boolean;
  databaseId?: string | null;
}

export interface PropertyDTO {
  id: string;
  name: string;
  type: PropertyType;
  options: SelectOption[] | null;
  databaseId: string;
}

export interface EntryDTO {
  id: string;
  pageId: string;
  databaseId: string;
  isTemplate: boolean;
  values: EntryValues;
  title: string;
  icon: string | null;
  updatedAt: string;
}

export interface ViewDTO {
  id: string;
  name: string;
  type: ViewType;
  config: ViewConfig;
  databaseId: string;
}

export interface DatabaseDTO {
  id: string;
  pageId: string;
  name: string;
  properties: PropertyDTO[];
  views: ViewDTO[];
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}
