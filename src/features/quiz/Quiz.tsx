"use client";

import { Button } from "@/components/ui/Button";
import { useDesk } from "@/lib/storage/desk";
import { useState } from "react";
import { QUESTIONS } from "./questions";

export function Quiz() {
  const best = useDesk((state) => state.bestQuiz);
  const setBest = useDesk((state) => state.setBestQuiz);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const question = QUESTIONS[index];
  const done = index >= QUESTIONS.length;

  function choose(choice: number) {
    if (picked != null || !question) return;
    setPicked(choice);
    if (choice === question.answer) setCorrect((value) => value + 1);
  }

  function next() {
    const score = correct;
    const upcoming = index + 1;
    if (upcoming >= QUESTIONS.length) setBest(score);
    setIndex(upcoming);
    setPicked(null);
  }

  if (done) {
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-10">
        <h1 className="font-display text-5xl">
          {correct} / {QUESTIONS.length}
        </h1>
        <p className="leading-7 text-mist">
          {correct >= 6
            ? "You can read the basic words. The market will still surprise you, which is the point of staying a student."
            : "A few of the words are still slippery. That's a fine place to be. Open a company and read the report card out loud."}
        </p>
        <p className="text-sm text-gold">Best score on this browser: {Math.max(best, correct)} / {QUESTIONS.length}</p>
        <Button
          onClick={() => {
            setIndex(0);
            setCorrect(0);
            setPicked(null);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-10">
      <p className="text-sm text-mist">
        Question {index + 1} of {QUESTIONS.length}
      </p>
      <h1 className="font-display text-4xl leading-tight">{question.prompt}</h1>
      <div className="grid gap-2">
        {question.choices.map((choice, choiceIndex) => {
          const show = picked != null;
          const isAnswer = choiceIndex === question.answer;
          const isPicked = choiceIndex === picked;
          const tone = !show ? "border-cream/15" : isAnswer ? "border-aurora bg-aurora/10" : isPicked ? "border-loss" : "border-cream/10 opacity-60";
          return (
            <button key={choice} type="button" onClick={() => choose(choiceIndex)} className={`rounded-2xl border px-4 py-3 text-left ${tone}`}>
              {choice}
            </button>
          );
        })}
      </div>
      {picked != null ? (
        <div>
          <p className="leading-7">{question.why}</p>
          <Button className="mt-4" onClick={next}>
            {index === QUESTIONS.length - 1 ? "See the score" : "Next"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
