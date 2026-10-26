export interface PageBrief {
  title: string;
  brief: string;
  tryThis: string;
}

const GENERIC: PageBrief = {
  title: "This screen",
  brief: "This screen is part of Maple Market, a visual way to learn about big Canadian stocks on the TSX. Nothing here buys or sells, and nothing predicts a price.",
  tryThis: "Read the heading, then ask what that heading is for.",
};

export const PAGE_BRIEFS = {
  explore: {
    title: "Explore",
    brief:
      "The TSX is drawn as a sky. Bigger planets are bigger companies. Greener means a stronger past year, and red a weaker one. Farther from its sector sun means a higher price for each dollar of profit. You can search a name or ticker, filter by sector, and switch Auto, 3D, or 2D. Click a planet to open that company. In 3D, drag to look around and scroll to zoom. The past year is history, not a forecast. A demo badge means the figures are practice data.",
    tryThis: "Search a ticker, or click a planet.",
  },
  heatmap: {
    title: "Stocks",
    brief:
      "Search a TSX name or ticker, or click a quilt tile, to preview that company's price chart on this page. Bigger rectangles are bigger companies. Green had a stronger past year, red a weaker one. The percent on a tile is that past year, not a forecast. See more opens the company page. Previous steps back through charts already previewed. A demo note means the figures are practice data.",
    tryThis: "Search a ticker, or click a rectangle to preview its chart.",
  },
  compare: {
    title: "Compare",
    brief:
      "Pick up to three companies, grouped by sector. A radar shape and a table show the report card for each one: price tag, profitability, growth, dividend, and steadiness. The shape is a comparison of those grades, not a winner. Grades describe the latest numbers. They are not a buy rating.",
    tryThis: "Pick two companies and read one row of the table.",
  },
  portfolio: {
    title: "Portfolio",
    brief:
      "A practice portfolio of share counts. Nothing is bought. Search or add a company, then set how many shares. The chart is the past value of that mix: each past price times the shares you hold, added together. The numbers on top are today's value and how that value changed over the chart. The band after today is a what-if: if the past year repeated, with a high and low range. It is not a promise. If there is not a full year of prices, the what-if uses 6% and says so.",
    tryThis: "Add a company and change the share count.",
  },
  dividends: {
    title: "Dividends",
    brief:
      "Pick a company, a starting amount, and a number of years. The checkbox reinvests cash into more shares. The chart shows yearly income from today's yield, then a 3% dividend raise and a 4% price rise. If a company has no dividend, the page says so.",
    tryThis: "Turn reinvesting on and off and watch the bars.",
  },
  retirement: {
    title: "Years from now",
    brief:
      "A classroom picture of compound growth. Set your age, when you stop working, money saved already, and money added each month. Cautious, Balanced, and Ambitious are assumed paces with more or less wobble, not forecasts. The inflation slider shows amounts in today's dollars. The band is a range from many imagined paths. It is not a promise about retirement.",
    tryThis: "Move the inflation slider and watch the band.",
  },
  quiz: {
    title: "Quiz",
    brief:
      "Short multiple-choice questions about shares, dividends, P/E, past returns, owning more than one company, yield, and market cap. After you pick, the page explains that answer. At the end you see a score. The best score on this browser is saved. The quiz does not choose a stock for you.",
    tryThis: "Answer one question and read the explanation before the next.",
  },
  stock: {
    title: "Company",
    brief:
      "The company page shows the share price chart and the figures behind five grades: valuation (price-to-earnings), profitability (return on equity), earnings growth, dividend yield and payout, and risk (debt and price swings). Each row shows the number, a grade, and why. Expand a row for the plain-English reason. Grades describe the latest numbers. They are not a buy rating. The briefing and headlines explain those numbers and do not predict a price.",
    tryThis: "Open one grade and read why it landed there.",
  },
  ask: {
    title: "Ask",
    brief:
      "A coach for investing questions. Three choices sit at the top: your goal, your horizon, and how a big drop would feel. They are saved on this device. Answers come back as cards with a headline, a plain answer, how it fits those choices, watch-outs, and meanings of words. The practice portfolio, if you saved one, can be mentioned. The coach will not tell you to buy or sell, and it will not guess a future price. If the model is off, the card says so.",
    tryThis: "Set the three choices, then ask one question in your own words.",
  },
} as const satisfies Record<string, PageBrief>;

export function pageBrief(pageId: string | undefined): PageBrief {
  if (pageId && Object.prototype.hasOwnProperty.call(PAGE_BRIEFS, pageId)) {
    return PAGE_BRIEFS[pageId as keyof typeof PAGE_BRIEFS];
  }
  return GENERIC;
}

export function pageIdFromPath(pathname: string): string {
  if (pathname === "/") return "explore";
  if (pathname === "/stock" || pathname.startsWith("/stock/")) return "stock";
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  return Object.prototype.hasOwnProperty.call(PAGE_BRIEFS, segment) ? segment : "other";
}
