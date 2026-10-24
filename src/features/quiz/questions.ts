export interface QuizQuestion {
  prompt: string;
  choices: string[];
  answer: number;
  why: string;
}

export const QUESTIONS: QuizQuestion[] = [
  {
    prompt: "What is a share?",
    choices: [
      "A loan you gave the company",
      "A small piece of ownership in the company",
      "A coupon for a discount at the store",
      "A promise the price will rise",
    ],
    answer: 1,
    why: "A share is a slice of the business. The price can fall even if you own a real piece of it.",
  },
  {
    prompt: "A dividend is…",
    choices: [
      "Cash the company pays to shareholders",
      "The fee a broker charges",
      "Proof the stock will go up",
      "The same thing as market cap",
    ],
    answer: 0,
    why: "A dividend is cash sent to owners. Companies can cut it. A high yield can be a warning as easily as a gift.",
  },
  {
    prompt: "Company A has a P/E of 10. Company B has a P/E of 40. Which price tag is richer compared with profit?",
    choices: ["A", "B", "They are the same", "P/E is the dividend"],
    answer: 1,
    why: "P/E is how many dollars you pay for one dollar of yearly profit. 40 is a richer price tag than 10. Richer is not automatically worse if profit is growing.",
  },
  {
    prompt: "A stock was green for the past year. What does that tell you about next year?",
    choices: [
      "It will be green again",
      "It will be red, because it already went up",
      "Nothing certain. The past year already happened",
      "You should buy it",
    ],
    answer: 2,
    why: "Past performance is a story about history. Maple Market will not turn it into a prediction.",
  },
  {
    prompt: "Why would a beginner own more than one company?",
    choices: [
      "So one bad year at one company is not the whole story",
      "Because the law requires ten stocks",
      "Because dividends are illegal in a single stock",
      "So the P/E becomes zero",
    ],
    answer: 0,
    why: "Spreading money around means one company's bad news is not your entire result. It does not remove risk.",
  },
  {
    prompt: "A very high dividend yield can mean…",
    choices: [
      "Free money with no downside",
      "The price fell, or the dividend may be hard to keep",
      "The company has no debt",
      "The shares cannot drop",
    ],
    answer: 1,
    why: "Yield is the dividend divided by the price. If the price crashes, the yield shoots up. Sometimes the dividend is then cut.",
  },
  {
    prompt: "Market cap is…",
    choices: [
      "The CEO's salary",
      "Share price times the number of shares",
      "Last year's profit",
      "The dividend cheque",
    ],
    answer: 1,
    why: "Market cap is a rough answer to how big the company is at today's price. A $10 share can be a huge company if there are billions of shares.",
  },
  {
    prompt: "What is Maple Market for?",
    choices: [
      "Placing trades",
      "Promising which stock goes up",
      "Learning how to read companies, without advice",
      "Replacing a paycheck",
    ],
    answer: 2,
    why: "This is a classroom. It does not buy, sell, or predict.",
  },
];
