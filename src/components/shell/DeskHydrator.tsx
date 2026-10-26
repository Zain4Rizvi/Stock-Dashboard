"use client";

import { useCoach } from "@/lib/storage/coach";
import { useDesk } from "@/lib/storage/desk";
import { useEffect } from "react";

export function DeskHydrator() {
  useEffect(() => {
    void useDesk.persist.rehydrate();
    void useCoach.persist.rehydrate();
  }, []);
  return null;
}
