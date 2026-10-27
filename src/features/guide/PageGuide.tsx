"use client";

import { Button } from "@/components/ui/Button";
import { GrowingField } from "@/components/ui/GrowingField";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { postAsk, recentHistory, sourceLine } from "@/lib/llm/client";
import { pageBrief, pageIdFromPath } from "@/lib/llm/pages";
import type { AskSource, GuideCard } from "@/lib/llm/schemas";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

interface Turn {
  id: string;
  role: "user" | "assistant";
  text: string;
  card?: GuideCard;
  source?: AskSource;
}

function questionBefore(turns: { id: string; role: string; text: string }[], id: string): string | null {
  const index = turns.findIndex((turn) => turn.id === id);
  for (let i = index - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn?.role === "user") return turn.text;
  }
  return null;
}

export function PageGuide() {
  const pathname = usePathname() ?? "/";
  const page = pageBrief(pageIdFromPath(pathname));
  const panelId = useId();
  const opener = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const opened = useRef(false);
  const request = useRef(0);
  const pathRef = useRef(pathname);
  const [scope, setScope] = useState(pathname);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);

  if (scope !== pathname) {
    setScope(pathname);
    setOpen(false);
    setTurns([]);
    setError(null);
    setDraft("");
    setLoading(false);
  }

  useLayoutEffect(() => {
    pathRef.current = pathname;
    request.current += 1;
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      if (opened.current) opener.current?.focus();
      return;
    }
    opened.current = true;
    input.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string, again = false) {
    const message = text.trim();
    if (!message || loading) return;
    const id = ++request.current;
    const sent = pathRef.current;
    const history = recentHistory(turns.map((turn) => ({ role: turn.role, text: turn.text })));
    setLoading(true);
    setError(null);
    if (!again) {
      setDraft("");
      setTurns((current) => [...current, { id: crypto.randomUUID(), role: "user", text: message }]);
    }
    try {
      const result = await postAsk({ mode: "guide", pageId: pageIdFromPath(sent), message, history });
      if (id !== request.current || pathRef.current !== sent) return;
      if (result.mode !== "guide") throw new Error("The teacher got tangled.");
      setTurns((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: result.card.answer,
          card: result.card,
          source: result.source,
        },
      ]);
    } catch (caught) {
      if (id === request.current) setError(caught instanceof Error ? caught.message : "The teacher got tangled.");
    } finally {
      if (id === request.current) setLoading(false);
    }
  }

  return (
    <>
      {open ? null : (
        <button
          ref={opener}
          type="button"
          aria-expanded={false}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
          className="fixed top-1/2 right-0 z-40 -translate-y-1/2 rounded-l-2xl bg-maple px-2 py-4 text-xs font-semibold tracking-wide text-ink shadow-lg [writing-mode:vertical-rl]"
        >
          <span className="sm:hidden">Ask</span>
          <span className="hidden sm:inline">Ask about this page</span>
        </button>
      )}
      {open ? (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button type="button" aria-label="Close the page guide" className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <aside id={panelId} aria-label="Ask about this page" className="relative flex h-full w-full max-w-md flex-col border-l border-cream/10 bg-pine shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-cream/10 px-4 py-4">
              <div>
                <p className="text-xs tracking-[0.18em] text-gold uppercase">This page</p>
                <h2 className="font-display text-3xl">{page.title}</h2>
              </div>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <div className="px-4 pt-4">
              <Disclaimer />
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {turns.length === 0 ? (
                <p className="text-sm leading-6 text-mist">
                  Ask what this page is for. It only knows this screen. A question about what fits you belongs on the Ask page.
                </p>
              ) : null}
              {turns.map((turn) =>
                turn.role === "user" ? (
                  <p key={turn.id} className="ml-auto w-fit max-w-[90%] rounded-2xl bg-cream/10 px-3 py-2 text-sm leading-6">
                    {turn.text}
                  </p>
                ) : (
                  <article key={turn.id} className="rounded-2xl border border-cream/10 bg-ink/40 p-3">
                    <p className="text-xs tracking-wide text-gold uppercase">{sourceLine(turn.source ?? "offline")}</p>
                    <p className="mt-2 text-sm leading-6">{turn.card?.answer}</p>
                    {turn.card?.tryThis ? <p className="mt-2 text-sm text-aurora">Try this: {turn.card.tryThis}</p> : null}
                    {turn.source === "unavailable" ? (
                      <Button
                        variant="ghost"
                        className="mt-3"
                        disabled={loading}
                        onClick={() => {
                          const question = questionBefore(turns, turn.id);
                          if (question) void send(question, true);
                        }}
                      >
                        Try again
                      </Button>
                    ) : null}
                  </article>
                ),
              )}
              {loading ? <p className="text-sm text-mist">Writing…</p> : null}
              {error ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-loss">{error}</p>
                  <Button
                    variant="ghost"
                    disabled={loading}
                    onClick={() => {
                      const question = [...turns].reverse().find((turn) => turn.role === "user")?.text;
                      if (question) void send(question, true);
                    }}
                  >
                    Try again
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="border-t border-cream/10 px-4 py-4">
              <p className="mb-3 text-sm">
                <Link href="/ask" className="text-gold underline">
                  Ask a real question
                </Link>
              </p>
              <form
                className="flex min-w-0 items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send(draft);
                }}
              >
                <GrowingField
                  ref={input}
                  value={draft}
                  maxLength={800}
                  aria-label="Question about this page"
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="What is this page doing?"
                  className="min-w-0 flex-1 rounded-2xl border border-cream/15 bg-ink px-3 py-2 text-sm text-cream outline-none placeholder:text-mist"
                />
                <Button type="submit" disabled={loading || draft.trim().length === 0}>
                  Ask
                </Button>
              </form>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
