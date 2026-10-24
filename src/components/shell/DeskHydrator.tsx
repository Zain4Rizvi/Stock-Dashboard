"use client";

import { useDesk } from "@/lib/storage/desk";
import { useEffect } from "react";

export function DeskHydrator() {
  useEffect(() => {
    void useDesk.persist.rehydrate();
  }, []);
  return null;
}
