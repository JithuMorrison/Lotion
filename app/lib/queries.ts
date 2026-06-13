"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  DatabaseDTO,
  EntryDTO,
  EntryValues,
  PageDTO,
  ViewDTO,
} from "@/lib/types";

export interface PageTreeNode extends PageDTO {
  isEntry?: boolean;
}

// --- Pages -----------------------------------------------------------------

export function usePageChildren(parentId: string | null) {
  return useQuery({
    queryKey: ["pages", parentId ?? "root"],
    queryFn: () =>
      api.get<PageTreeNode[]>(
        parentId ? `/api/pages?parentId=${parentId}` : "/api/pages"
      ),
  });
}

export function usePage(id: string | null) {
  return useQuery({
    queryKey: ["page", id],
    queryFn: () => api.get<PageDTO & { databaseId: string | null; isDatabase: boolean }>(`/api/pages/${id}`),
    enabled: !!id,
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title?: string; parentId?: string | null }) =>
      api.post<PageDTO>("/api/pages", body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["pages", vars.parentId ?? "root"] });
    },
  });
}

export function useCreateDatabase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; parentId?: string | null }) =>
      api.post<{ databaseId: string; pageId: string }>("/api/databases", body),
    onSuccess: () => {
      // The new database is also a page, so refresh the sidebar tree.
      qc.invalidateQueries({ queryKey: ["pages"] });
    },
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<PageDTO>) =>
      api.patch<PageDTO>(`/api/pages/${id}`, body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["page", data.id] });
      qc.invalidateQueries({ queryKey: ["pages"] });
    },
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/pages/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pages"] });
    },
  });
}

// --- Databases -------------------------------------------------------------

export function useDatabase(id: string | null) {
  return useQuery({
    queryKey: ["database", id],
    queryFn: () => api.get<DatabaseDTO>(`/api/databases/${id}`),
    enabled: !!id,
  });
}

// --- Entries ---------------------------------------------------------------

export function useEntries(databaseId: string | null) {
  return useQuery({
    queryKey: ["entries", databaseId],
    queryFn: () => api.get<EntryDTO[]>(`/api/databases/${databaseId}/entries`),
    enabled: !!databaseId,
  });
}

export function useTemplates(databaseId: string | null) {
  return useQuery({
    queryKey: ["templates", databaseId],
    queryFn: () =>
      api.get<{ id: string; title: string; icon: string | null; updatedAt: string }[]>(
        `/api/databases/${databaseId}/templates`
      ),
    enabled: !!databaseId,
  });
}

export const entriesKey = (databaseId: string) => ["entries", databaseId];

export function useUpdateEntry(databaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      values,
      isTemplate,
      autoCreateOptions,
    }: {
      entryId: string;
      values?: EntryValues;
      isTemplate?: boolean;
      autoCreateOptions?: boolean;
    }) =>
      api.patch<EntryDTO>(`/api/databases/${databaseId}/entries/${entryId}`, {
        values,
        isTemplate,
        autoCreateOptions,
      }),
    // Optimistic update with rollback.
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: entriesKey(databaseId) });
      const prev = qc.getQueryData<EntryDTO[]>(entriesKey(databaseId));
      if (prev && vars.values) {
        qc.setQueryData<EntryDTO[]>(
          entriesKey(databaseId),
          prev.map((e) =>
            e.id === vars.entryId
              ? { ...e, values: { ...e.values, ...vars.values } }
              : e
          )
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(entriesKey(databaseId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: entriesKey(databaseId) });
      qc.invalidateQueries({ queryKey: ["database", databaseId] });
    },
  });
}

export function useCreateEntry(databaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title?: string; values?: EntryValues }) =>
      api.post<EntryDTO>(`/api/databases/${databaseId}/entries`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: entriesKey(databaseId) });
      qc.invalidateQueries({ queryKey: ["pages"] });
    },
  });
}

export function useDuplicateEntry(databaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      values,
    }: {
      entryId: string;
      values?: EntryValues;
    }) =>
      api.post<EntryDTO>(
        `/api/databases/${databaseId}/entries/${entryId}/duplicate`,
        { values }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: entriesKey(databaseId) });
      qc.invalidateQueries({ queryKey: ["pages"] });
    },
  });
}

// --- Views -----------------------------------------------------------------

export function useCreateView(databaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ViewDTO>) =>
      api.post<ViewDTO>(`/api/databases/${databaseId}/views`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["database", databaseId] }),
  });
}

export function useUpdateView(databaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ viewId, ...body }: { viewId: string } & Partial<ViewDTO>) =>
      api.patch<ViewDTO>(`/api/databases/${databaseId}/views/${viewId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["database", databaseId] }),
  });
}

export function useDeleteView(databaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (viewId: string) =>
      api.del(`/api/databases/${databaseId}/views/${viewId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["database", databaseId] }),
  });
}

// --- Properties ------------------------------------------------------------

export function useCreateProperty(databaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; type: string; options?: unknown }) =>
      api.post(`/api/databases/${databaseId}/properties`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["database", databaseId] }),
  });
}

export function useUpdateProperty(databaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      propertyId,
      ...body
    }: {
      propertyId: string;
      name?: string;
      type?: string;
      options?: unknown;
    }) =>
      api.patch(
        `/api/databases/${databaseId}/properties/${propertyId}`,
        body
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["database", databaseId] }),
  });
}

export function useDeleteProperty(databaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (propertyId: string) =>
      api.del(`/api/databases/${databaseId}/properties/${propertyId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["database", databaseId] }),
  });
}
