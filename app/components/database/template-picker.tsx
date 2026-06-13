"use client";

import { formatDistanceToNow } from "date-fns";
import { FileText } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useTemplates } from "@/lib/queries";

// Modal listing the database's templates. `onPick(null)` creates a blank entry.
export function TemplatePicker({
  databaseId,
  open,
  onClose,
  onPick,
}: {
  databaseId: string;
  open: boolean;
  onClose: () => void;
  onPick: (templateId: string | null) => void;
}) {
  const { data: templates } = useTemplates(databaseId);

  return (
    <Modal open={open} onClose={onClose} title="New entry">
      <div className="space-y-1">
        <button
          onClick={() => onPick(null)}
          className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted"
        >
          <FileText className="size-4 text-muted-foreground" />
          Blank entry
        </button>

        {templates && templates.length > 0 && (
          <>
            <div className="px-1 pt-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Templates
            </div>
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onPick(t.id)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="text-base">{t.icon ?? "📄"}</span>
                <span className="flex-1 truncate">{t.title}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}
