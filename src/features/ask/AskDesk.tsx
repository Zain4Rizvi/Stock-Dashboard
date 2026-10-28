"use client";

import { Button } from "@/components/ui/Button";
import { GrowingField } from "@/components/ui/GrowingField";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { postAsk, recentHistory, sourceLine } from "@/lib/llm/client";
import { DROP_OPTIONS, GOAL_OPTIONS, HORIZON_OPTIONS, type Profile } from "@/lib/llm/schemas";
import { useCoach } from "@/lib/storage/coach";
import { useDesk } from "@/lib/storage/desk";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const STARTERS = [
  "What does a dividend actually do for someone like me?",
  "Why would I own more than one company?",
  "What would a bad year feel like with my portfolio?",
];

export function AskDesk() {
  const profile = useCoach((state) => state.profile);
  const messages = useCoach((state) => state.messages);
  const setProfile = useCoach((state) => state.setProfile);
  const push = useCoach((state) => state.push);
  const clear = useCoach((state) => state.clear);
  const holdings = useDesk((state) => state.holdings);
  const [ready, setReady] = useState(() => useCoach.persist.hasHydrated());
  const [draftProfile, setDraftProfile] = useState<Partial<Profile>>(() => useCoach.getState().profile ?? {});
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const unsub = useCoach.persist.onFinishHydration(() => {
      setDraftProfile(useCoach.getState().profile ?? {});
      setReady(true);
    });
    void useCoach.persist.rehydrate();
    return () => {
      alive.current = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, loading]);

  function pick<K extends keyof Profile>(key: K, value: Profile[K]) {
    const next = { ...draftProfile, [key]: value };
    setDraftProfile(next);
    if (next.goal && next.horizon && next.drop) setProfile({ goal: next.goal, horizon: next.horizon, drop: next.drop });
  }

  async function send(text: string, again = false) {
    const message = text.trim();
    if (!message || loading) return;
    const prior = useCoach.getState().messages;
    const history = recentHistory(
      prior.map((turn) => ({
        role: turn.role,
        text: turn.card ? `${turn.card.headline}. ${turn.card.answer}` : turn.text,
      })),
    );
    setLoading(true);
    setError(null);
    if (!again) {
      setDraft("");
      push({ id: crypto.randomUUID(), role: "user", text: message });
    }
    try {
      const result = await postAsk({
        mode: "coach",
        message,
        history,
        profile: useCoach.getState().profile,
        holdings: useDesk
          .getState()
          .holdings.flatMap((holding) =>
            typeof holding.shares === "number" && Number.isFinite(holding.shares) && holding.shares > 0
              ? [{ symbol: holding.symbol, shares: holding.shares }]
              : [],
          )
          .slice(0, 12),
      });
      if (result.mode !== "coach") throw new Error("The teacher got tangled.");
      push({
        id: crypto.randomUUID(),
        role: "assistant",
        text: `${result.card.headline}. ${result.card.answer}`,
        card: result.card,
        source: result.source,
      });
    } catch (caught) {
      if (alive.current) setError(caught instanceof Error ? caught.message : "The teacher got tangled.");
    } finally {
      if (alive.current) setLoading(false);
    }
  }

  if (!ready) return <p className="px-4 py-10 text-mist">Opening the desk…</p>;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 py-6">
      <header className="shrink-0">
        <h1 className="font-display text-5xl">Ask</h1>
        <p className="mt-3 max-w-2xl leading-7 text-mist">
          Real questions, answered in pieces. Set the three choices so the fit line is about you. Until then, it says those choices are empty.
        </p>
      </header>
      <div className="mt-4 shrink-0">
        <Disclaimer prominent />
      </div>
      <div className="mt-4 grid shrink-0 gap-3">
        <Chips label="Goal" options={GOAL_OPTIONS} value={draftProfile.goal} onChange={(value) => pick("goal", value)} />
        <Chips label="Horizon" options={HORIZON_OPTIONS} value={draftProfile.horizon} onChange={(value) => pick("horizon", value)} />
        <Chips label="If it dropped a lot" options={DROP_OPTIONS} value={draftProfile.drop} onChange={(value) => pick("drop", value)} />
        <p className="text-sm leading-6 text-mist">
          {holdings.length === 0 ? (
            <>
              Nothing saved yet.{" "}
              <Link href="/portfolio" className="text-gold underline">
                Add shares
              </Link>{" "}
              and they can show up in the fit line.
            </>
          ) : (
            <>Portfolio: {holdings.map((holding) => holding.symbol).join(", ")}.</>
          )}
          {profile ? " Saved on this device." : null}
        </p>
      </div>
      <div ref={scroller} className="mt-4 min-h-48 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="grid gap-2">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                className="rounded-2xl border border-cream/15 px-4 py-3 text-left text-sm leading-6 hover:border-cream/40"
                onClick={() => void send(starter)}
              >
                {starter}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {messages.map((turn) =>
              turn.card ? (
                <article key={turn.id} className="rounded-3xl border border-cream/10 bg-pine/80 p-4">
                  <p className="text-xs tracking-wide text-gold uppercase">{sourceLine(turn.source ?? "offline")}</p>
                  <SnapshotLine card={turn.card} />
                  <h2 className="mt-2 font-display text-2xl">{turn.card.headline}</h2>
                  <p className="mt-2 leading-7">{turn.card.answer}</p>
                  <p className="mt-3 text-sm leading-6 text-mist">{turn.card.fit}</p>
                  {turn.card.watchouts.length > 0 ? (
                    <div className="mt-3">
                      <h3 className="text-sm text-gold">Worth a second look</h3>
                      <ul className="mt-1 grid gap-1 text-sm leading-6">
                        {turn.card.watchouts.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {turn.card.terms.length > 0 ? (
                    <dl className="mt-3 grid gap-2">
                      {turn.card.terms.map((term) => (
                        <div key={term.word}>
                          <dt className="text-sm text-aurora">{term.word}</dt>
                          <dd className="text-sm leading-6 text-mist">{term.plain}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {turn.card.followUp?.trim() ? <p className="mt-3 text-sm leading-6">Next: {turn.card.followUp}</p> : null}
                  {turn.source === "unavailable" ? (
                    <Button
                      variant="ghost"
                      className="mt-3"
                      disabled={loading}
                      onClick={() => {
                        const question = questionBefore(messages, turn.id);
                        if (question) void send(question, true);
                      }}
                    >
                      Try again
                    </Button>
                  ) : null}
                </article>
              ) : (
                <p key={turn.id} className="ml-auto w-fit max-w-[90%] rounded-2xl bg-cream/10 px-3 py-2 text-sm leading-6">
                  {turn.text}
                </p>
              ),
            )}
          </div>
        )}
        {loading ? <p className="mt-3 text-sm text-mist">Writing…</p> : null}
        {error ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-loss">{error}</p>
            <Button
              variant="ghost"
              disabled={loading}
              onClick={() => {
                const question = [...messages].reverse().find((turn) => turn.role === "user")?.text;
                if (question) void send(question, true);
              }}
            >
              Try again
            </Button>
          </div>
        ) : null}
      </div>
      <form
        className="mt-4 flex min-w-0 shrink-0 flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <GrowingField
          value={draft}
          maxLength={800}
          aria-label="Investing question"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about a company, a word, or your mix"
          className="min-w-0 flex-1 rounded-2xl border border-cream/15 bg-pine px-3 py-2 text-cream outline-none placeholder:text-mist"
        />
        <Button type="submit" disabled={loading || draft.trim().length === 0}>
          Ask
        </Button>
        {messages.length > 0 ? (
          <Button variant="ghost" disabled={loading} onClick={clear}>
            Clear
          </Button>
        ) : null}
      </form>
    </div>
  );
}

function SnapshotLine({ card }: { card: { sourceNote?: string | null; asOf?: string | null } }) {
  const line = [card.sourceNote, card.asOf ? `as of ${card.asOf}` : null].filter(Boolean).join(" · ");
  if (!line) return null;
  return <p className="mt-1 text-sm leading-6 text-mist">{line}</p>;
}

function questionBefore(messages: { id: string; role: string; text: string }[], id: string): string | null {
  const index = messages.findIndex((turn) => turn.id === id);
  for (let i = index - 1; i >= 0; i--) {
    const turn = messages[i];
    if (turn?.role === "user") return turn.text;
  }
  return null;
}

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm text-gold">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={`rounded-full px-3 py-1.5 text-sm ${value === option.id ? "bg-cream text-ink" : "border border-cream/15 text-cream"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
