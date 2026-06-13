import type { Prisma } from "@/app/generated/prisma/client";

// Prisma's generated input types for Json columns don't accept arbitrary typed
// objects (Record/array) without a cast. Runtime accepts these values (and JS
// `null` for nullable Json columns) fine; this helper just satisfies the types.
export function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
