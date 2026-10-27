"use client";

import { useLayoutEffect, useRef, type ComponentProps, type KeyboardEvent, type Ref } from "react";

const MAX_LINES = 6;

export function enterSends(key: string, shift: boolean, coarsePointer: boolean) {
  return key === "Enter" && !shift && !coarsePointer;
}

function grow(el: HTMLTextAreaElement) {
  el.style.overflowY = "hidden";
  el.style.height = "0px";
  const style = getComputedStyle(el);
  const line = Number.parseFloat(style.lineHeight) || 24;
  const pad = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
  const border = (Number.parseFloat(style.borderTopWidth) || 0) + (Number.parseFloat(style.borderBottomWidth) || 0);
  const cap = line * MAX_LINES + pad + border;
  const needed = Math.max(el.scrollHeight + border, line + pad + border);
  el.style.height = `${Math.min(needed, cap)}px`;
  el.style.overflowY = needed > cap + 1 ? "auto" : "hidden";
}

function placeRef(ref: Ref<HTMLTextAreaElement> | undefined, node: HTMLTextAreaElement | null) {
  if (typeof ref === "function") {
    ref(node);
    return;
  }
  if (ref) ref.current = node;
}

export function GrowingField({ className = "", onKeyDown, value, ref, ...props }: ComponentProps<"textarea">) {
  const field = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    grow(el);
    const fit = () => grow(el);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [value]);

  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) {
      onKeyDown?.(event);
      return;
    }
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (enterSends(event.key, event.shiftKey, coarse)) {
      event.preventDefault();
      if (!event.repeat) {
        const submitter = event.currentTarget.form?.querySelector("button[type='submit']");
        if (submitter instanceof HTMLButtonElement && !submitter.disabled) submitter.click();
      }
    }
    onKeyDown?.(event);
  }

  return (
    <textarea
      {...props}
      value={value}
      ref={(node) => {
        field.current = node;
        placeRef(ref, node);
      }}
      rows={1}
      onKeyDown={onKey}
      className={`min-w-0 max-w-full resize-none overflow-x-hidden leading-6 wrap-anywhere whitespace-pre-wrap ${className}`}
    />
  );
}
