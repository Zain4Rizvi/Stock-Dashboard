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
    title: "Heatmap",
    brief:
      "The market as a quilt. Bigger rectangles are bigger companies. Green had a stronger past year, red a weaker one. The percent on a tile is that past year, not a forecast. Click a rectangle to open the company. A demo badge means the figures are practice data.",
    tryThis: "Click a rectangle to open that company.",
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
      "A practice portfolio. Drag a company into the basket, or press Add. Type pretend dollars for each one. Nothing is bought. You can remove a company. A chart shows how the pretend dollars are split. If yields stayed the same, a line estimates a year of dividend cash. The past-year move of the mix is history. A what-if further down assumes the whole pile grows at 6% a year and you add nothing. That pace is assumed, not promised.",
    tryThis: "Add one company and type a pretend dollar amount.",
  },
  "time-machine": {
    title: "Replay",
    brief:
      "Pick a company, a pretend amount, and how far back to look: the past year or the past 5 years, when those prices exist. The line uses only prices already in the snapshot. It shows what that pretend amount became at the last price. It does not show next year.",
    tryThis: "Choose a company and switch between the past year and the past 5 years.",
  },
  dividends: {
    title: "Dividends",
    brief:
      "A dividend is cash a company sends to owners. Pick a company, a starting amount, and a number of years. The checkbox reinvests that cash into more shares. The chart uses today's yield, then imagines a 3% dividend raise and a 4% price rise. That imagination is labeled as such. If a company shows no dividend, the page says your result would come from the share price, not a cheque.",
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
      "One company. You see its sector, a short blurb, the latest price, and today's change. A chart draws the past year. The report card grades price tag, profitability, growth, dividend, and steadiness from the latest numbers, and says they are not a buy rating. You can add the company to the practice portfolio or open Compare. Explain this company retells the report card in everyday language. The mood panel talks about headlines when they exist, and is not a forecast. A glossary defines the words. A demo badge means the figures are practice data.",
    tryThis: "Read one grade, then the glossary line for that word.",
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
