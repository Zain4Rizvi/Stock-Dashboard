"use client";

import { PageSkeleton } from "@/components/shell/PageSkeleton";
import { useNavPending } from "@/components/shell/nav-pending";

export function SlowVeil() {
  const pending = useNavPending();
  if (!pending) return null;
  return (
    <div className="page-veil absolute inset-0 z-20 overflow-auto bg-ink">
      <PageSkeleton />
    </div>
  );
}
