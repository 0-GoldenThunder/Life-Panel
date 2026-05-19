/**
 * src/lib/zeroStateQuotes.ts
 * The "Deliberate Void" System.
 * Time-of-day contextual quotes for empty states to maintain luxury aesthetic.
 * MUST only be executed client-side to prevent hydration mismatches and timezone issues.
 */

const DAWN_QUOTES = [
  "A clean slate before the world wakes.",
  "The day is unwritten.",
  "Quiet potential.",
  "Morning clarity."
];

const MORNING_QUOTES = [
  "Nothing outstanding. A rare luxury.",
  "Clarity before the noise.",
  "Uncluttered space, uncluttered mind.",
  "Deliberate focus."
];

const AFTERNOON_QUOTES = [
  "The quietest hours are often the most productive.",
  "Progress, unhurried.",
  "Measured momentum.",
  "A steady pace."
];

const EVENING_QUOTES = [
  "Peace in the void. Rest well.",
  "What was done is enough.",
  "The evening settles.",
  "Reflect and release."
];

const NIGHT_QUOTES = [
  "Stillness is not absence. It is clarity.",
  "The ledger is closed for today.",
  "Rest is productive.",
  "Quiet observation."
];

export const getZeroStateQuote = (): string => {
  const hour = new Date().getHours();
  
  let pool: string[];

  if (hour >= 5 && hour < 9) {
    pool = DAWN_QUOTES;
  } else if (hour >= 9 && hour < 12) {
    pool = MORNING_QUOTES;
  } else if (hour >= 12 && hour < 17) {
    pool = AFTERNOON_QUOTES;
  } else if (hour >= 17 && hour < 21) {
    pool = EVENING_QUOTES;
  } else {
    // 21:00 to 04:59
    pool = NIGHT_QUOTES;
  }

  // Random selection
  return pool[Math.floor(Math.random() * pool.length)];
};
