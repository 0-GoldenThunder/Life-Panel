/**
 * src/pages/api/ai-advisor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Secure Astro server endpoint for AI financial analysis.
 *
 * Security model:
 *  - GEMINI_API_KEY lives exclusively here, never in browser code
 *  - Only accepts POST requests with a validated JSON payload
 *  - Payload is capped at 50KB to prevent abuse
 *  - No raw transaction data is accepted — only aggregated summaries
 *  - Returns structured JSON with graceful error shapes
 *
 * Error codes returned:
 *  400 — Bad request (missing/invalid payload)
 *  405 — Method not allowed (non-POST)
 *  503 — API key not configured
 *  429 — Gemini rate limit hit
 *  502 — Gemini API error (upstream failure)
 *  504 — Gemini API timeout
 *  500 — Unexpected server error
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { APIRoute } from 'astro';

// ── Constants ────────────────────────────────────────────────────────────────
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const MAX_PAYLOAD_BYTES = 50_000; // 50KB hard limit
const REQUEST_TIMEOUT_MS = 25_000; // 25 second timeout

// System prompt: defines the AI advisor's persona and strict behavior rules
const SYSTEM_PROMPT = `You are a professional, critical, and data-driven personal financial advisor embedded in a private finance app called "Life Panel". You analyze the user's real aggregated financial data and provide structured, actionable advice.

RULES YOU MUST FOLLOW:
1. Only reference numbers and facts present in the provided data. Do not invent, hallucinate, or assume any figures.
2. Be direct, honest, and critical. Do not sugarcoat problems. If the financial situation is poor, say so clearly.
3. Every insight MUST include a specific, actionable next step — not vague advice.
4. Structure your response as a JSON object with exactly this shape:
{
  "overallScore": <number 1-10, financial health score>,
  "scoreLabel": <"Critical" | "Poor" | "Fair" | "Good" | "Excellent">,
  "executiveSummary": <2-3 sentence overall assessment, brutally honest>,
  "insights": [
    {
      "severity": <"critical" | "warning" | "opportunity" | "tip">,
      "title": <short, specific title>,
      "detail": <2-3 sentences analyzing the specific data point>,
      "metric": <the key metric, e.g. "38% of income">,
      "action": <one specific, concrete action to take this week>
    }
  ],
  "priorityActions": [<top 3 most important actions as strings, ordered by urgency>],
  "projectionNote": <1 sentence on likely financial trajectory if current behavior continues>
}

5. Generate 3-6 insights. Always address: cash flow health, savings rate, expense concentration, subscription burden, and income stability if data is available.
6. Insights must be sorted: critical first, then warning, then opportunity, then tip.
7. Return ONLY the raw JSON object. No markdown code fences, no preamble, no explanation.`;

// ── Type Definitions ──────────────────────────────────────────────────────────
interface AdvisorPayload {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    savingsRate: number;
    topCategories: { name: string; amount: number; percentage: number }[];
    subscriptionBurnMonthly: number;
    subscriptionCount: number;
    incomeSourceCount: number;
    transactionCount: number;
    currency: string;
    scope: string;
    periodLabel: string;
  };
}

interface GeminiCandidate {
  content?: { parts?: { text?: string }[] };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { code?: number; message?: string; status?: string };
}

// ── Helper: Build the user prompt from validated summary data ────────────────
function buildUserPrompt(payload: AdvisorPayload): string {
  const s = payload.summary;
  const topCatsFormatted = s.topCategories
    .map(c => `  - ${c.name}: ${s.currency}${c.amount.toFixed(2)} (${c.percentage.toFixed(1)}% of expenses)`)
    .join('\n');

  return `Analyze the following financial data for the "${s.scope}" scope over "${s.periodLabel}":

INCOME & CASH FLOW:
  - Total Income: ${s.currency}${s.totalIncome.toFixed(2)}
  - Total Expenses: ${s.currency}${s.totalExpenses.toFixed(2)}
  - Net Cash Flow: ${s.currency}${s.netCashFlow.toFixed(2)}
  - Savings Rate: ${s.savingsRate.toFixed(1)}%
  - Total Transactions Analyzed: ${s.transactionCount}

TOP EXPENSE CATEGORIES:
${topCatsFormatted || '  - No categorized expenses recorded'}

SUBSCRIPTIONS:
  - Active Subscriptions: ${s.subscriptionCount}
  - Monthly Subscription Burn: ${s.currency}${s.subscriptionBurnMonthly.toFixed(2)}

INCOME SOURCES:
  - Active Income Sources: ${s.incomeSourceCount}

Provide your structured JSON analysis now.`;
}

// ── Validation ────────────────────────────────────────────────────────────────
function validatePayload(body: unknown): body is AdvisorPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (!b.summary || typeof b.summary !== 'object') return false;
  const s = b.summary as Record<string, unknown>;
  return (
    typeof s.totalIncome === 'number' &&
    typeof s.totalExpenses === 'number' &&
    typeof s.netCashFlow === 'number' &&
    typeof s.savingsRate === 'number' &&
    typeof s.transactionCount === 'number' &&
    typeof s.currency === 'string' &&
    typeof s.scope === 'string' &&
    typeof s.periodLabel === 'string' &&
    Array.isArray(s.topCategories) &&
    typeof s.subscriptionBurnMonthly === 'number' &&
    typeof s.subscriptionCount === 'number' &&
    typeof s.incomeSourceCount === 'number'
  );
}

// ── Main Route Handler ────────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  // ── 1. Method guard (redundant but explicit) ──
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── 2. API key guard ──
  const apiKey = import.meta.env.GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '' || apiKey === 'your-gemini-api-key-here') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Gemini API key is not configured on the server.',
        code: 'API_KEY_MISSING',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── 3. Payload size guard ──
  const contentLength = parseInt(request.headers.get('content-length') ?? '0', 10);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return new Response(
      JSON.stringify({ success: false, error: 'Payload too large.', code: 'PAYLOAD_TOO_LARGE' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── 4. Parse & validate body ──
  let body: unknown;
  try {
    const rawText = await request.text();
    if (!rawText || rawText.length > MAX_PAYLOAD_BYTES) {
      throw new Error('Empty or oversized body');
    }
    body = JSON.parse(rawText);
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON body.', code: 'INVALID_JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!validatePayload(body)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing or invalid fields in payload.', code: 'INVALID_PAYLOAD' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── 5. Build Gemini request ──
  const userPrompt = buildUserPrompt(body);
  const geminiRequestBody = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.3,       // Low temperature = more consistent, factual responses
      maxOutputTokens: 1500,  // Sufficient for 3-6 insight cards
      responseMimeType: 'application/json', // Force JSON output
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  // ── 6. Call Gemini API with timeout ──
  let geminiResponse: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    geminiResponse = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiRequestBody),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return new Response(
      JSON.stringify({
        success: false,
        error: isTimeout ? 'Gemini API request timed out.' : 'Network error reaching Gemini API.',
        code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      }),
      { status: isTimeout ? 504 : 502, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // ── 7. Handle Gemini HTTP error responses ──
  if (!geminiResponse.ok) {
    let geminiError: GeminiResponse = {};
    try { geminiError = await geminiResponse.json() as GeminiResponse; } catch { /* ignore */ }

    // Rate limit
    if (geminiResponse.status === 429) {
      const retryAfter = geminiResponse.headers.get('Retry-After') ?? '60';
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Gemini API rate limit reached. Please wait before trying again.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: parseInt(retryAfter, 10),
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: geminiError?.error?.message ?? `Gemini API returned status ${geminiResponse.status}.`,
        code: 'GEMINI_API_ERROR',
        statusCode: geminiResponse.status,
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── 8. Parse Gemini response ──
  let geminiData: GeminiResponse;
  try {
    geminiData = await geminiResponse.json() as GeminiResponse;
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to parse Gemini response.', code: 'PARSE_ERROR' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── 9. Extract text content from response ──
  const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText || rawText.trim() === '') {
    const finishReason = geminiData?.candidates?.[0]?.finishReason;
    return new Response(
      JSON.stringify({
        success: false,
        error: `Gemini returned an empty response. Finish reason: ${finishReason ?? 'unknown'}.`,
        code: 'EMPTY_RESPONSE',
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── 10. Parse the AI-generated JSON report ──
  let report: unknown;
  try {
    // Strip any accidental markdown fences in case the model misbehaves
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    report = JSON.parse(cleaned);
  } catch {
    // Return the raw text with a flag so the client can display it gracefully
    return new Response(
      JSON.stringify({
        success: true,
        report: null,
        rawText,
        usedFallback: false,
        parseError: true,
        generatedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── 11. Success ──
  return new Response(
    JSON.stringify({
      success: true,
      report,
      rawText: null,
      usedFallback: false,
      parseError: false,
      generatedAt: new Date().toISOString(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

// Reject all other HTTP methods
export const GET: APIRoute = () =>
  new Response(JSON.stringify({ success: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
