"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-xl border border-border bg-popover p-5 shadow-xl",
          className
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 className="mb-3 text-base font-semibold text-foreground">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
