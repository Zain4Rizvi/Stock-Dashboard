"use client";

import { Button } from "@/components/ui/Button";
import { useDesk } from "@/lib/storage/desk";
import Link from "next/link";
import { useState } from "react";
import { missedQuizIndexes } from "./missed";
import { QUESTIONS } from "./questions";

export function Quiz() {
  const best = useDesk((state) => state.bestQuiz);
  const setBest = useDesk((state) => state.setBestQuiz);
  const setMissedQuiz = useDesk((state) => state.setMissedQuiz);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [choices, setChoices] = useState<number[]>([]);
  const question = QUESTIONS[index];
  const done = index >= QUESTIONS.length;
  const missed = missedQuizIndexes(
    choices,
    QUESTIONS.map((item) => item.answer),
  );

  function choose(choice: number) {
    if (picked != null || !question) return;
    setPicked(choice);
    setChoices((current) => {
      const nextChoices = current.slice();
      nextChoices[index] = choice;
      return nextChoices;
    });
    if (choice === question.answer) setCorrect((value) => value + 1);
  }

  function next() {
    const score = correct;
    const upcoming = index + 1;
    if (upcoming >= QUESTIONS.length) {
      setBest(score);
      setMissedQuiz(missed);
    }
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
          {missed.length === 0
            ? "You can read the basic words. The market will still surprise you, which is the point of staying a student."
            : "A few of the words are still slippery. That's a fine place to be. The questions below are the ones to read again. This quiz does not pick a stock."}
        </p>
        {missed.length > 0 ? (
          <div>
            <h2 className="font-display text-2xl">Questions to read again</h2>
            <ul className="mt-2 grid list-disc gap-2 pl-5 leading-7">
              {missed.map((questionIndex) => {
                const prompt = QUESTIONS[questionIndex]?.prompt;
                return prompt ? <li key={questionIndex}>{prompt}</li> : null;
              })}
            </ul>
          </div>
        ) : null}
        <p className="text-sm text-gold">Best score on this browser: {Math.max(best, correct)} / {QUESTIONS.length}</p>
        <p className="leading-7">
          <Link href="/ask" className="text-gold underline decoration-cream/30 underline-offset-2">
            Ask about a word
          </Link>
        </p>
        <Button
          onClick={() => {
            setIndex(0);
            setCorrect(0);
            setPicked(null);
            setChoices([]);
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
