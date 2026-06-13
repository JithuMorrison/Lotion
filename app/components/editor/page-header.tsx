"use client";

import { useRef, useState } from "react";
import { ImagePlus, Smile, X } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const EMOJIS = [
  "📋","📝","✅","📅","🏃","🤝","🚀","💡","🔥","⭐","📌","📁","📊","🎯","🐛","🔧",
  "📦","🎨","🧩","💬","📈","🗂️","🏷️","⚙️","🌟","❤️","🟢","🟡","🔴","🔵","🟣","🏠",
];

export function PageHeader({
  title,
  icon,
  coverUrl,
  onTitleChange,
  onIconChange,
  onCoverChange,
  saveStatus,
  rightSlot,
}: {
  title: string;
  icon: string | null;
  coverUrl: string | null;
  onTitleChange: (title: string) => void;
  onIconChange: (icon: string | null) => void;
  onCoverChange: (url: string | null) => void;
  saveStatus?: "idle" | "saving" | "saved";
  rightSlot?: React.ReactNode;
}) {
  // Initialized from the title prop; the parent remounts this component (via a
  // key on the page id) when navigating, so no sync effect is needed.
  const [localTitle, setLocalTitle] = useState(title);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushTitle = (value: string) => {
    setLocalTitle(value);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => onTitleChange(value), 600);
  };

  return (
    <div>
      {coverUrl && (
        <div className="group relative h-44 w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt="cover"
            className="h-full w-full object-cover"
          />
          <button
            onClick={() => onCoverChange(null)}
            className="absolute right-3 top-3 hidden rounded bg-black/50 p-1 text-white group-hover:block"
            aria-label="Remove cover"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-14 pt-8">
        <div className="mb-2 flex items-center gap-2">
          <Popover
            align="start"
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="flex size-16 items-center justify-center rounded-lg text-5xl hover:bg-muted"
                aria-label="Change icon"
              >
                {icon ?? <Smile className="size-7 text-muted-foreground" />}
              </button>
            )}
          >
            {(close) => (
              <div className="w-64 p-1">
                <div className="grid grid-cols-8 gap-0.5">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        onIconChange(e);
                        close();
                      }}
                      className="flex size-7 items-center justify-center rounded text-lg hover:bg-muted"
                    >
                      {e}
                    </button>
                  ))}
                </div>
                {icon && (
                  <button
                    onClick={() => {
                      onIconChange(null);
                      close();
                    }}
                    className="mt-1 w-full rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
                  >
                    Remove icon
                  </button>
                )}
              </div>
            )}
          </Popover>
        </div>

        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          {!icon && (
            <IconAddButton onIconChange={onIconChange} />
          )}
          {!coverUrl && <CoverAddButton onCoverChange={onCoverChange} />}
          <div className="ml-auto flex items-center gap-2">
            {saveStatus === "saving" && <span>Saving…</span>}
            {saveStatus === "saved" && (
              <span className="text-green-600">Saved</span>
            )}
            {rightSlot}
          </div>
        </div>

        <input
          value={localTitle}
          onChange={(e) => pushTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full bg-transparent text-4xl font-bold text-foreground outline-none placeholder:text-muted-foreground/40"
        />
      </div>
    </div>
  );
}

function IconAddButton({
  onIconChange,
}: {
  onIconChange: (icon: string) => void;
}) {
  return (
    <Popover
      align="start"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-muted hover:text-foreground"
        >
          <Smile className="size-3.5" /> Add icon
        </button>
      )}
    >
      {(close) => (
        <div className="grid w-64 grid-cols-8 gap-0.5 p-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => {
                onIconChange(e);
                close();
              }}
              className="flex size-7 items-center justify-center rounded text-lg hover:bg-muted"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

function CoverAddButton({
  onCoverChange,
}: {
  onCoverChange: (url: string) => void;
}) {
  const [url, setUrl] = useState("");
  return (
    <Popover
      align="start"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className={cn(
            "flex items-center gap-1 rounded px-1.5 py-1 hover:bg-muted hover:text-foreground"
          )}
        >
          <ImagePlus className="size-3.5" /> Add cover
        </button>
      )}
    >
      {(close) => (
        <div className="w-64 p-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste an image URL…"
            className="mb-2 w-full rounded border border-border bg-background px-2 py-1 text-sm outline-none"
          />
          <button
            onClick={() => {
              if (url.trim()) onCoverChange(url.trim());
              close();
            }}
            className="w-full rounded bg-primary px-2 py-1 text-sm text-primary-foreground hover:bg-primary/80"
          >
            Set cover
          </button>
        </div>
      )}
    </Popover>
  );
}
