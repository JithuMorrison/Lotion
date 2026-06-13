"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { useUserStore } from "@/lib/stores";
import { colorClass } from "@/lib/colors";
import { cn } from "@/lib/utils";
import type {
  DateValue,
  PropertyDTO,
  PropertyValue,
  SelectOption,
} from "@/lib/types";

export function PropertyField({
  property,
  value,
  onChange,
  onAddOption,
  compact,
}: {
  property: PropertyDTO;
  value: PropertyValue;
  onChange: (value: PropertyValue) => void;
  onAddOption?: (option: SelectOption) => void;
  compact?: boolean;
}) {
  switch (property.type) {
    case "select":
    case "status":
      return (
        <SelectField
          property={property}
          value={value as string}
          onChange={onChange}
          onAddOption={onAddOption}
        />
      );
    case "multi_select":
      return (
        <MultiSelectField
          property={property}
          value={(value as string[]) ?? []}
          onChange={onChange}
          onAddOption={onAddOption}
        />
      );
    case "date":
      return <DateField value={value as DateValue | null} onChange={onChange} />;
    case "person":
      return <PersonField value={value as string | null} onChange={onChange} />;
    case "number":
      return (
        <NumberField value={value as number | null} onChange={onChange} compact={compact} />
      );
    case "checkbox":
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 accent-primary"
        />
      );
    case "url":
      return <UrlField value={value as string | null} onChange={onChange} />;
    default:
      return (
        <span className="text-sm text-muted-foreground">
          {value ? String(value) : "—"}
        </span>
      );
  }
}

function Pill({ option }: { option: SelectOption }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        colorClass(option.color)
      )}
    >
      {option.label}
    </span>
  );
}

function SelectField({
  property,
  value,
  onChange,
  onAddOption,
}: {
  property: PropertyDTO;
  value: string;
  onChange: (v: PropertyValue) => void;
  onAddOption?: (o: SelectOption) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const options = property.options ?? [];
  const current = options.find((o) => o.label === value);

  return (
    <Popover
      align="start"
      trigger={({ toggle }) => (
        <button onClick={toggle} className="flex min-h-7 items-center text-left">
          {current ? (
            <Pill option={current} />
          ) : (
            <span className="text-sm text-muted-foreground">Empty</span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="w-52 p-1">
          {options.map((o) => (
            <button
              key={o.label}
              onClick={() => {
                onChange(o.label);
                close();
              }}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 hover:bg-muted"
            >
              <Pill option={o} />
              {value === o.label && <Check className="size-3.5" />}
            </button>
          ))}
          {value && (
            <button
              onClick={() => {
                onChange("");
                close();
              }}
              className="w-full rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
            >
              Clear
            </button>
          )}
          {onAddOption && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const label = newLabel.trim();
                if (!label) return;
                onAddOption({ label, color: "gray" });
                onChange(label);
                setNewLabel("");
                close();
              }}
              className="mt-1 flex items-center gap-1 border-t border-border px-1 pt-1"
            >
              <Plus className="size-3.5 text-muted-foreground" />
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Add option…"
                className="w-full bg-transparent py-1 text-sm outline-none"
              />
            </form>
          )}
        </div>
      )}
    </Popover>
  );
}

function MultiSelectField({
  property,
  value,
  onChange,
  onAddOption,
}: {
  property: PropertyDTO;
  value: string[];
  onChange: (v: PropertyValue) => void;
  onAddOption?: (o: SelectOption) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const options = property.options ?? [];
  const selected = options.filter((o) => value.includes(o.label));

  const toggleOption = (label: string) => {
    if (value.includes(label)) onChange(value.filter((v) => v !== label));
    else onChange([...value, label]);
  };

  return (
    <Popover
      align="start"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="flex min-h-7 flex-wrap items-center gap-1 text-left"
        >
          {selected.length > 0 ? (
            selected.map((o) => <Pill key={o.label} option={o} />)
          ) : (
            <span className="text-sm text-muted-foreground">Empty</span>
          )}
        </button>
      )}
    >
      {() => (
        <div className="w-52 p-1">
          {options.map((o) => (
            <button
              key={o.label}
              onClick={() => toggleOption(o.label)}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 hover:bg-muted"
            >
              <Pill option={o} />
              {value.includes(o.label) && <Check className="size-3.5" />}
            </button>
          ))}
          {onAddOption && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const label = newLabel.trim();
                if (!label) return;
                onAddOption({ label, color: "gray" });
                onChange([...value, label]);
                setNewLabel("");
              }}
              className="mt-1 flex items-center gap-1 border-t border-border px-1 pt-1"
            >
              <Plus className="size-3.5 text-muted-foreground" />
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Add option…"
                className="w-full bg-transparent py-1 text-sm outline-none"
              />
            </form>
          )}
        </div>
      )}
    </Popover>
  );
}

function DateField({
  value,
  onChange,
}: {
  value: DateValue | null;
  onChange: (v: PropertyValue) => void;
}) {
  const start = value?.start ?? "";
  const end = value?.end ?? "";
  return (
    <div className="flex items-center gap-1">
      <input
        type="date"
        value={start}
        onChange={(e) =>
          onChange(
            e.target.value ? { start: e.target.value, end: value?.end ?? null } : null
          )
        }
        className="rounded border border-border bg-background px-1.5 py-0.5 text-sm outline-none"
      />
      {start && (
        <>
          <span className="text-xs text-muted-foreground">→</span>
          <input
            type="date"
            value={end}
            onChange={(e) =>
              onChange({ start, end: e.target.value || null })
            }
            className="rounded border border-border bg-background px-1.5 py-0.5 text-sm outline-none"
          />
        </>
      )}
    </div>
  );
}

function PersonField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: PropertyValue) => void;
}) {
  const users = useUserStore((s) => s.users);
  const list = Array.from(users.values());
  const current = value ? users.get(value) : undefined;

  return (
    <Popover
      align="start"
      trigger={({ toggle }) => (
        <button onClick={toggle} className="flex min-h-7 items-center text-left">
          {current ? (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Avatar name={current.name} />
              {current.name}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Empty</span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="w-52 p-1">
          {list.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                onChange(u.id);
                close();
              }}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 hover:bg-muted"
            >
              <span className="inline-flex items-center gap-1.5 text-sm">
                <Avatar name={u.name} />
                {u.name}
              </span>
              {value === u.id && <Check className="size-3.5" />}
            </button>
          ))}
          {value && (
            <button
              onClick={() => {
                onChange(null);
                close();
              }}
              className="w-full rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </Popover>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
      {initials}
    </span>
  );
}

function NumberField({
  value,
  onChange,
  compact,
}: {
  value: number | null;
  onChange: (v: PropertyValue) => void;
  compact?: boolean;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) =>
        onChange(e.target.value === "" ? null : Number(e.target.value))
      }
      placeholder="Empty"
      className={cn(
        "rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none hover:border-border focus:border-border",
        compact ? "w-20" : "w-full"
      )}
    />
  );
}

function UrlField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: PropertyValue) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (!editing && value) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={() => setEditing(true)}
        className="truncate text-sm text-blue-600 underline"
      >
        {value}
      </a>
    );
  }
  return (
    <input
      autoFocus={editing}
      type="url"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      onBlur={() => setEditing(false)}
      placeholder="https://…"
      className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none hover:border-border focus:border-border"
    />
  );
}
