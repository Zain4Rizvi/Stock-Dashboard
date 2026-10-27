/** Question indexes whose choice does not match the answer. A missing choice counts as missed. */
export function missedQuizIndexes(choices: readonly number[], answers: readonly number[]): number[] {
  const missed: number[] = [];
  for (let index = 0; index < answers.length; index++) {
    if (choices[index] !== answers[index]) missed.push(index);
  }
  return missed;
}
