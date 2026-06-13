import { create } from "zustand";
import type { UserDTO } from "@/lib/types";

// --- Theme store: light/dark/system with localStorage persistence ----------
export type Theme = "light" | "dark" | "system";
const THEME_KEY = "theme";

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}
function resolveTheme(t: Theme): "light" | "dark" {
  return t === "system" ? (prefersDark() ? "dark" : "light") : t;
}
function applyThemeClass(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

interface ThemeStoreState {
  theme: Theme; // user preference
  resolved: "light" | "dark"; // actually applied
  setTheme: (t: Theme) => void;
  hydrate: () => void;
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  theme: "system",
  resolved: "light",
  setTheme: (t) => {
    localStorage.setItem(THEME_KEY, t);
    const resolved = resolveTheme(t);
    applyThemeClass(resolved);
    set({ theme: t, resolved });
  },
  // Called once on mount: read the stored preference, apply it, and keep
  // "system" mode in sync with OS changes.
  hydrate: () => {
    const stored = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
    const resolved = resolveTheme(stored);
    applyThemeClass(resolved);
    set({ theme: stored, resolved });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", () => {
      if (get().theme === "system") {
        const r = prefersDark() ? "dark" : "light";
        applyThemeClass(r);
        set({ resolved: r });
      }
    });
  },
}));

// --- User store: hydrated once on app load from /api/users -----------------
interface UserStoreState {
  users: Map<string, UserDTO>;
  hydrated: boolean;
  setUsers: (users: UserDTO[]) => void;
  getUser: (id: string) => UserDTO | undefined;
}

export const useUserStore = create<UserStoreState>((set, get) => ({
  users: new Map(),
  hydrated: false,
  setUsers: (users) =>
    set({ users: new Map(users.map((u) => [u.id, u])), hydrated: true }),
  getUser: (id) => get().users.get(id),
}));

// --- Editor store: tracks pending save state for the open page -------------
type SaveStatus = "idle" | "saving" | "saved";

interface EditorStoreState {
  pendingSave: boolean;
  saveStatus: SaveStatus;
  setSaving: () => void;
  setSaved: () => void;
  setIdle: () => void;
}

export const useEditorStore = create<EditorStoreState>((set) => ({
  pendingSave: false,
  saveStatus: "idle",
  setSaving: () => set({ pendingSave: true, saveStatus: "saving" }),
  setSaved: () => set({ pendingSave: false, saveStatus: "saved" }),
  setIdle: () => set({ pendingSave: false, saveStatus: "idle" }),
}));
