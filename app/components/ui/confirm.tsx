"use client";

import { create } from "zustand";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  resolve?: (ok: boolean) => void;
  ask: (opts: {
    title: string;
    message?: string;
    confirmLabel?: string;
  }) => Promise<boolean>;
  close: (ok: boolean) => void;
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  title: "",
  message: "",
  confirmLabel: "Delete",
  ask: ({ title, message = "", confirmLabel = "Delete" }) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, title, message, confirmLabel, resolve });
    }),
  close: (ok) => {
    get().resolve?.(ok);
    set({ open: false, resolve: undefined });
  },
}));

// Hook returns an async confirm() — resolves true if the user confirms.
export function useConfirm() {
  return useConfirmStore((s) => s.ask);
}

// Mounted once near the app root.
export function ConfirmHost() {
  const { open, title, message, confirmLabel, close } = useConfirmStore();
  return (
    <Modal open={open} onClose={() => close(false)} title={title}>
      {message && (
        <p className="mb-4 text-sm text-muted-foreground">{message}</p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => close(false)}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={() => close(true)}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
