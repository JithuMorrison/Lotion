"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import {
  useCreateProperty,
  useDeleteProperty,
  useUpdateProperty,
} from "@/lib/queries";
import { PROPERTY_TYPES, OPTION_COLORS } from "@/lib/types";
import { colorClass } from "@/lib/colors";
import { cn } from "@/lib/utils";
import type { DatabaseDTO, PropertyType, SelectOption } from "@/lib/types";

export function PropertyPanel({
  database,
  open,
  onClose,
}: {
  database: DatabaseDTO;
  open: boolean;
  onClose: () => void;
}) {
  const createProp = useCreateProperty(database.id);
  const updateProp = useUpdateProperty(database.id);
  const deleteProp = useDeleteProperty(database.id);
  const confirm = useConfirm();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<PropertyType>("select");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const needsOptions =
      newType === "select" ||
      newType === "multi_select" ||
      newType === "status";
    await createProp.mutateAsync({
      name: newName.trim(),
      type: newType,
      options: needsOptions ? [] : undefined,
    });
    setNewName("");
    setNewType("select");
    setAdding(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Delete property '${name}'?`,
      message: "This cannot be undone.",
    });
    if (ok) deleteProp.mutate(id);
  };

  return (
    <Modal open={open} onClose={onClose} title="Properties" className="max-w-lg">
      <div className="space-y-1.5">
        {database.properties.map((p) => (
          <PropertyRow
            key={p.id}
            property={p}
            onRename={(name) => updateProp.mutate({ propertyId: p.id, name })}
            onRetype={(type) => updateProp.mutate({ propertyId: p.id, type })}
            onOptionsChange={(options) =>
              updateProp.mutate({ propertyId: p.id, options })
            }
            onDelete={() => handleDelete(p.id, p.name)}
          />
        ))}
      </div>

      {adding ? (
        <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Property name"
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm outline-none"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as PropertyType)}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm outline-none"
          >
            {PROPERTY_TYPES.filter((t) => t.value !== "title").map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd}>
              Add
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 flex w-full items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          <Plus className="size-4" /> Add a property
        </button>
      )}
    </Modal>
  );
}

function PropertyRow({
  property,
  onRename,
  onRetype,
  onOptionsChange,
  onDelete,
}: {
  property: DatabaseDTO["properties"][number];
  onRename: (name: string) => void;
  onRetype: (type: string) => void;
  onOptionsChange: (options: SelectOption[]) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(property.name);
  const [expanded, setExpanded] = useState(false);
  const hasOptions =
    property.type === "select" ||
    property.type === "multi_select" ||
    property.type === "status";
  const isTitle = property.type === "title";

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <GripVertical className="size-3.5 text-muted-foreground" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== property.name && onRename(name)}
          disabled={isTitle}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:opacity-60"
        />
        <select
          value={property.type}
          onChange={(e) => onRetype(e.target.value)}
          disabled={isTitle}
          className="rounded border border-border bg-background px-1.5 py-0.5 text-xs outline-none disabled:opacity-60"
        >
          {PROPERTY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {hasOptions && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted"
          >
            Options
          </button>
        )}
        {!isTitle && (
          <button
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
            aria-label="Delete property"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      {expanded && hasOptions && (
        <OptionEditor
          options={property.options ?? []}
          onChange={onOptionsChange}
        />
      )}
    </div>
  );
}

function OptionEditor({
  options,
  onChange,
}: {
  options: SelectOption[];
  onChange: (options: SelectOption[]) => void;
}) {
  const [newLabel, setNewLabel] = useState("");

  const updateOption = (index: number, patch: Partial<SelectOption>) => {
    onChange(options.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  };

  return (
    <div className="space-y-1.5 border-t border-border p-2">
      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={o.label}
            onChange={(e) => updateOption(i, { label: e.target.value })}
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium outline-none",
              colorClass(o.color)
            )}
          />
          <div className="flex items-center gap-1">
            {OPTION_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => updateOption(i, { color: c })}
                className={cn(
                  "size-4 rounded-full border",
                  colorClass(c),
                  o.color === c ? "ring-2 ring-foreground/40" : ""
                )}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <button
            onClick={() => onChange(options.filter((_, idx) => idx !== i))}
            className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
            aria-label="Remove option"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newLabel.trim()) return;
          onChange([...options, { label: newLabel.trim(), color: "gray" }]);
          setNewLabel("");
        }}
        className="flex items-center gap-1 pt-1"
      >
        <Plus className="size-3.5 text-muted-foreground" />
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Add option…"
          className="w-full bg-transparent py-1 text-sm outline-none"
        />
      </form>
    </div>
  );
}
