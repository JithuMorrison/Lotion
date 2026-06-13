"use client";

import { useEffect, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useUserStore, useThemeStore } from "@/lib/stores";
import type { UserDTO } from "@/lib/types";

// Applies the persisted theme preference once the app mounts. The pre-paint
// inline script in layout.tsx already set the initial class to avoid a flash;
// this keeps the store in sync and wires up OS-preference changes.
function ThemeHydrator() {
  const hydrate = useThemeStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return null;
}

// Hydrates the Zustand user store once from /api/users.
function UserStoreHydrator() {
  const setUsers = useUserStore((s) => s.setUsers);
  const { data } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<UserDTO[]>("/api/users"),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (data) setUsers(data);
  }, [data, setUsers]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5_000, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <ThemeHydrator />
      <UserStoreHydrator />
      {children}
    </QueryClientProvider>
  );
}
