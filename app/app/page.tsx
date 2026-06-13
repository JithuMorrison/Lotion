"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePageChildren } from "@/lib/queries";

export default function Home() {
  const router = useRouter();
  const { data, isLoading } = usePageChildren(null);

  useEffect(() => {
    if (data && data.length > 0) {
      router.replace(`/p/${data[0].id}`);
    }
  }, [data, router]);

  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {isLoading
        ? "Loading workspace…"
        : data && data.length === 0
          ? "No pages yet — create one from the sidebar."
          : "Opening…"}
    </div>
  );
}
