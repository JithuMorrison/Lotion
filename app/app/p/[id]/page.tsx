"use client";

import { use } from "react";
import { PageScreen } from "@/components/page-screen";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PageScreen pageId={id} />;
}
