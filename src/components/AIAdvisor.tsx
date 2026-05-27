/**
 * src/components/AIAdvisor.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full AI Financial Advisor UI component.
 *
 * Features:
 *  - Aggregates real financial data from nanostores (zero raw data sent to AI)
 *  - Instant rule-based insights rendered immediately
 *  - Gemini AI deep analysis via /api/ai-advisor (server-side, key-protected)
 *  - Full error handling: offline, rate-limited, API error, key missing, no data
 *  - 30-second cooldown between AI requests (respects 15 RPM free tier limit)
 *  - Scope selector: Personal / Business / Combined
 *  - Data transparency panel: shows user exactly what was sent to AI
 *  - Premium dark UI consistent with the app design system
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import {
  $transactions, $subscriptions, $inflows,
  $activeCurrency, $isDbReady, convertCurrency,
} from '../stores/lifeStore';
import {
  generateRuleBasedInsights, sortInsightsBySeverity,
  type FinancialSummary, type FinancialInsight, type InsightSeverity,
} from '../lib/financialRules';
import { Icon } from './ui/Icon';
import {
  BrainCircuit, Sparkles, RefreshCw, AlertTriangle, TrendingUp,
  Lightbulb, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  ShieldAlert, Wifi, WifiOff, Info, BarChart3, Loader2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
type AnalysisScope = 'personal' | 'business' | 'combined';

interface AIReport {
  overallScore: number;
  scoreLabel: 'Critical' | 'Poor' | 'Fair' | 'Good' | 'Excellent';
  executiveSummary: string;
  insights: FinancialInsight[];
  priorityActions: string[];
  projectionNote: string;
}

interface APIResponse {
  success: boolean;
  report: AIReport | null;
  rawText: string | null;
  usedFallback?: boolean;
  parseError?: boolean;
  error?: string;
  code?: string;
  retryAfterSeconds?: number;
  generatedAt?: string;
}

type ErrorState =
  | { type: 'none' }
  | { type: 'no_data' }
  | { type: 'api_key_missing' }
  | { type: 'rate_limited'; retryAfterSeconds: number }
  | { type: 'offline' }
  | { type: 'timeout' }
  | { type: 'gemini_error'; message: string }
  | { type: 'parse_error'; rawText: string };

// ── Constants ──────────────────────────────────────────────────────────────
const COOLDOWN_SECONDS = 30;
const PERIOD_DAYS = 90;

// ── Helper: Severity config ────────────────────────────────────────────────
function getSeverityConfig(severity: InsightSeverity) {
  switch (severity) {
    case 'critical':
      return {
        icon: AlertTriangle,
        color: 'text-soft-crimson',
        bg: 'bg-soft-crimson/10',
        border: 'border-soft-crimson/30',
        badge: 'bg-soft-crimson/20 text-soft-crimson',
        label: 'Critical',
      };
    case 'warning':
      return {
        icon: ShieldAlert,
        color: 'text-muted-amber',
        bg: 'bg-muted-amber/10',
        border: 'border-muted-amber/30',
        badge: 'bg-muted-amber/20 text-muted-amber',
        label: 'Warning',
      };
    case 'opportunity':
      return {
        icon: TrendingUp,
        color: 'text-luxury-gold',
        bg: 'bg-luxury-gold/10',
        border: 'border-luxury-gold/30',
        badge: 'bg-luxury-gold/20 text-luxury-gold',
        label: 'Opportunity',
      };
    case 'tip':
      return {
        icon: Lightbulb,
        color: 'text-platinum/70',
        bg: 'bg-platinum/5',
        border: 'border-platinum/15',
        badge: 'bg-platinum/10 text-platinum/70',
        label: 'Tip',
      };
  }
}

function getScoreColor(score: number): string {
  if (score <= 3) return 'text-soft-crimson';
  if (score <= 5) return 'text-muted-amber';
  if (score <= 7) return 'text-luxury-gold';
  return 'text-emerald-400';
}

// ── Sub-components ──────────────────────────────────────────────────────────

const InsightCard: React.FC<{ insight: FinancialInsight; index: number }> = ({ insight, index }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = getSeverityConfig(insight.severity);
  const SeverityIcon = cfg.icon;

  return (
    <div
      className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 flex flex-col gap-3 transition-all duration-200 hover:border-opacity-60`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>
            <Icon icon={SeverityIcon} className={`w-4 h-4 ${cfg.color}`} />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-platinum text-sm leading-tight">{insight.title}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge} uppercase tracking-wider shrink-0`}>
                {cfg.label}
              </span>
            </div>
            {insight.metric && (
              <span className={`text-xs font-mono font-semibold ${cfg.color}`}>{insight.metric}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-1.5 rounded-lg text-platinum/40 hover:text-platinum hover:bg-white/5 transition-colors"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <Icon icon={expanded ? ChevronUp : ChevronDown} className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 pl-11 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-platinum/70 text-sm leading-relaxed">{insight.detail}</p>
          {insight.action && (
            <div className="flex items-start gap-2 bg-white/5 rounded-lg p-3 border border-white/10">
              <Icon icon={CheckCircle2} className="w-4 h-4 text-luxury-gold shrink-0 mt-0.5" />
              <p className="text-sm text-platinum/80 leading-relaxed">
                <span className="font-semibold text-luxury-gold">Action: </span>
                {insight.action}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DataTransparencyPanel: React.FC<{ summary: FinancialSummary; isOpen: boolean; onToggle: () => void }> = ({
  summary, isOpen, onToggle,
}) => (
  <div className="rounded-xl border border-[#222] bg-[#0A0A0A]/50 overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
    >
      <div className="flex items-center gap-2 text-platinum/50">
        <Icon icon={Info} className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider">What was sent to AI</span>
      </div>
      <Icon icon={isOpen ? ChevronUp : ChevronDown} className="w-4 h-4 text-platinum/30" />
    </button>
    {isOpen && (
      <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in duration-200">
        {[
          { label: 'Total Income', value: `${summary.currency}${summary.totalIncome.toFixed(2)}` },
          { label: 'Total Expenses', value: `${summary.currency}${summary.totalExpenses.toFixed(2)}` },
          { label: 'Net Cash Flow', value: `${summary.netCashFlow >= 0 ? '+' : ''}${summary.currency}${summary.netCashFlow.toFixed(2)}` },
          { label: 'Savings Rate', value: `${summary.savingsRate.toFixed(1)}%` },
          { label: 'Subscriptions', value: `${summary.subscriptionCount} (${summary.currency}${summary.subscriptionBurnMonthly.toFixed(0)}/mo)` },
          { label: 'Income Sources', value: `${summary.incomeSourceCount} active` },
          { label: 'Transactions', value: `${summary.transactionCount} analyzed` },
          { label: 'Scope', value: summary.scope.charAt(0).toUpperCase() + summary.scope.slice(1) },
          { label: 'Period', value: summary.periodLabel },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-xs text-platinum/30 uppercase tracking-wider">{label}</span>
            <span className="text-xs font-mono text-platinum/60">{value}</span>
          </div>
        ))}
        <div className="col-span-full mt-1 pt-3 border-t border-[#222]">
          <p className="text-xs text-platinum/30">
            ℹ️ Only aggregated totals above are sent. No transaction IDs, notes, dates, or personal identifiers are shared.
          </p>
        </div>
        {summary.topCategories.length > 0 && (
          <div className="col-span-full">
            <span className="text-xs text-platinum/30 uppercase tracking-wider block mb-2">Top Expense Categories Sent</span>
            <div className="flex flex-col gap-1">
              {summary.topCategories.map(cat => (
                <div key={cat.name} className="flex justify-between text-xs font-mono">
                  <span className="text-platinum/50">{cat.name}</span>
                  <span className="text-platinum/40">{summary.currency}{cat.amount.toFixed(2)} ({cat.percentage.toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);

// ── Error UI Renderer ───────────────────────────────────────────────────────
const ErrorDisplay: React.FC<{ error: ErrorState; onRetry: () => void }> = ({ error, onRetry }) => {
  const [countdown, setCountdown] = useState(
    error.type === 'rate_limited' ? error.retryAfterSeconds : 0
  );

  useEffect(() => {
    if (error.type !== 'rate_limited' || countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [error, countdown]);

  if (error.type === 'none' || error.type === 'no_data') return null;

  const configs = {
    api_key_missing: {
      icon: XCircle, color: 'text-soft-crimson', border: 'border-soft-crimson/30', bg: 'bg-soft-crimson/10',
      title: 'AI Advisor Not Configured',
      message: 'The GEMINI_API_KEY is missing from your server environment. Add it to your .env file and restart the dev server.',
      showRetry: false,
    },
    rate_limited: {
      icon: Clock, color: 'text-muted-amber', border: 'border-muted-amber/30', bg: 'bg-muted-amber/10',
      title: 'Rate Limit Reached',
      message: `The free Gemini API tier has a 15 requests/minute limit. ${countdown > 0 ? `Retry available in ${countdown}s.` : 'You can retry now.'}`,
      showRetry: countdown <= 0,
    },
    offline: {
      icon: WifiOff, color: 'text-platinum/50', border: 'border-platinum/20', bg: 'bg-platinum/5',
      title: 'You Are Offline',
      message: 'AI analysis requires an internet connection. The rule-based insights below are still available.',
      showRetry: true,
    },
    timeout: {
      icon: Clock, color: 'text-muted-amber', border: 'border-muted-amber/30', bg: 'bg-muted-amber/10',
      title: 'Request Timed Out',
      message: 'The Gemini API took too long to respond (>25 seconds). This is usually temporary.',
      showRetry: true,
    },
    gemini_error: {
      icon: XCircle, color: 'text-soft-crimson', border: 'border-soft-crimson/30', bg: 'bg-soft-crimson/10',
      title: 'AI Service Error',
      message: (error as { type: 'gemini_error'; message: string }).message || 'Gemini API returned an unexpected error. Showing rule-based insights instead.',
      showRetry: true,
    },
    parse_error: {
      icon: AlertTriangle, color: 'text-muted-amber', border: 'border-muted-amber/30', bg: 'bg-muted-amber/10',
      title: 'Response Format Issue',
      message: 'The AI response could not be structured into insight cards. Raw analysis is shown below.',
      showRetry: true,
    },
  } as const;

  const cfg = configs[error.type as keyof typeof configs];
  if (!cfg) return null;
  const ErrorIcon = cfg.icon;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 flex items-start gap-3`}>
      <Icon icon={ErrorIcon} className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.color}`} />
      <div className="flex flex-col gap-1 flex-1">
        <span className={`font-semibold text-sm ${cfg.color}`}>{cfg.title}</span>
        <p className="text-sm text-platinum/60 leading-relaxed">{cfg.message}</p>
        {error.type === 'parse_error' && (error as { type: 'parse_error'; rawText: string }).rawText && (
          <pre className="mt-2 text-xs text-platinum/50 bg-black/30 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap">
            {(error as { type: 'parse_error'; rawText: string }).rawText}
          </pre>
        )}
      </div>
      {cfg.showRetry && (
        <button
          onClick={onRetry}
          disabled={error.type === 'rate_limited' && countdown > 0}
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-platinum hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <Icon icon={RefreshCw} className="w-3 h-3" />
          {error.type === 'rate_limited' && countdown > 0 ? `${countdown}s` : 'Retry'}
        </button>
      )}
    </div>
  );
};

// ── Data Aggregation ────────────────────────────────────────────────────────
function aggregateFinancialData(
  transactions: ReturnType<typeof $transactions.get>,
  subscriptions: ReturnType<typeof $subscriptions.get>,
  inflows: ReturnType<typeof $inflows.get>,
  currency: string,
  scope: AnalysisScope,
): FinancialSummary {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS);

  // Filter by scope and date
  const activeTxs = transactions.filter(t => {
    if (t._deleted) return false;
    if (scope !== 'combined' && t.financeScope !== scope) return false;
    return new Date(t.date) >= cutoff;
  });

  // Convert all amounts to active currency
  const toActiveCurrency = (amount: number, fromCurrency: string) =>
    convertCurrency(amount, fromCurrency || 'MYR', currency);

  const income = activeTxs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + toActiveCurrency(t.amount, t.currency), 0);

  const expenses = activeTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + toActiveCurrency(t.amount, t.currency), 0);

  const netCashFlow = income - expenses;
  const savingsRate = income > 0 ? ((netCashFlow / income) * 100) : 0;

  // Top expense categories (aggregate by category name)
  const categoryMap = new Map<string, number>();
  activeTxs.filter(t => t.type === 'expense').forEach(t => {
    const converted = toActiveCurrency(t.amount, t.currency);
    categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + converted);
  });

  const topCategories = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: expenses > 0 ? (amount / expenses) * 100 : 0,
    }));

  // Active subscriptions
  const activeSubs = subscriptions.filter(s => {
    if (s._deleted || !s.isActive) return false;
    if (scope !== 'combined' && s.financeScope !== scope) return false;
    return true;
  });

  const subscriptionBurnMonthly = activeSubs.reduce((sum, s) => {
    const monthly = s.billingCycle === 'yearly'
      ? toActiveCurrency(s.amount, s.currency) / 12
      : toActiveCurrency(s.amount, s.currency);
    return sum + monthly;
  }, 0);

  // Active income sources
  const activeInflows = inflows.filter(inf => {
    if (inf._deleted || !inf.isActive) return false;
    if (scope !== 'combined' && inf.financeScope !== scope) return false;
    return true;
  });

  return {
    totalIncome: income,
    totalExpenses: expenses,
    netCashFlow,
    savingsRate,
    topCategories,
    subscriptionBurnMonthly,
    subscriptionCount: activeSubs.length,
    incomeSourceCount: activeInflows.length,
    transactionCount: activeTxs.length,
    currency,
    scope,
    periodLabel: `Last ${PERIOD_DAYS} days`,
  };
}

// ── Main Component ──────────────────────────────────────────────────────────
export const AIAdvisor: React.FC = () => {
  const transactions = useStore($transactions);
  const subscriptions = useStore($subscriptions);
  const inflows = useStore($inflows);
  const currency = useStore($activeCurrency);
  const isDbReady = useStore($isDbReady);

  const [scope, setScope] = useState<AnalysisScope>('combined');
  const [isLoading, setIsLoading] = useState(false);
  const [aiReport, setAiReport] = useState<AIReport | null>(null);
  const [errorState, setErrorState] = useState<ErrorState>({ type: 'none' });
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [showPriorityActions, setShowPriorityActions] = useState(true);

  // Aggregate data reactively based on scope
  const summary = useMemo(
    () => aggregateFinancialData(transactions, subscriptions, inflows, currency, scope),
    [transactions, subscriptions, inflows, currency, scope]
  );

  // Rule-based insights — always computed instantly
  const ruleInsights = useMemo(
    () => sortInsightsBySeverity(generateRuleBasedInsights(summary)),
    [summary]
  );

  // AI insights — from report (override rules when available)
  const displayInsights: FinancialInsight[] = useMemo(() => {
    if (aiReport?.insights && aiReport.insights.length > 0) {
      return aiReport.insights;
    }
    return ruleInsights;
  }, [aiReport, ruleInsights]);

  const hasData = summary.transactionCount > 0;

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const t = setTimeout(() => setCooldownRemaining(c => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldownRemaining]);

  const handleGenerateAnalysis = useCallback(async () => {
    if (isLoading || cooldownRemaining > 0) return;

    if (!hasData) {
      setErrorState({ type: 'no_data' });
      return;
    }

    // Check online status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrorState({ type: 'offline' });
      return;
    }

    setIsLoading(true);
    setErrorState({ type: 'none' });
    setAiReport(null);

    try {
      const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });

      const data: APIResponse = await response.json();

      if (!data.success) {
        switch (data.code) {
          case 'API_KEY_MISSING':
            setErrorState({ type: 'api_key_missing' });
            break;
          case 'RATE_LIMITED':
            setErrorState({ type: 'rate_limited', retryAfterSeconds: data.retryAfterSeconds ?? 60 });
            break;
          case 'TIMEOUT':
            setErrorState({ type: 'timeout' });
            break;
          case 'NETWORK_ERROR':
            setErrorState({ type: 'offline' });
            break;
          default:
            setErrorState({ type: 'gemini_error', message: data.error ?? 'Unknown error from AI service.' });
        }
        return;
      }

      if (data.parseError && data.rawText) {
        setErrorState({ type: 'parse_error', rawText: data.rawText });
        return;
      }

      if (data.report) {
        setAiReport(data.report);
        setLastGeneratedAt(new Date(data.generatedAt ?? Date.now()));
        setCooldownRemaining(COOLDOWN_SECONDS);
      }

    } catch (err) {
      // Network fetch itself failed (true offline / CORS / DNS)
      if (!navigator.onLine) {
        setErrorState({ type: 'offline' });
      } else {
        setErrorState({ type: 'gemini_error', message: 'Failed to reach the analysis endpoint. Is the dev server running?' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, cooldownRemaining, hasData, summary]);

  const handleRetry = useCallback(() => {
    setErrorState({ type: 'none' });
    handleGenerateAnalysis();
  }, [handleGenerateAnalysis]);

  const handleScopeChange = (newScope: AnalysisScope) => {
    setScope(newScope);
    setAiReport(null); // Clear stale AI report when scope changes
    setErrorState({ type: 'none' });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isDbReady) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Icon icon={Loader2} className="w-8 h-8 text-luxury-gold animate-spin" />
        <p className="text-platinum/40 text-sm">Initializing data engine…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl w-full">

      {/* ── Scope Selector ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex bg-[#1A1A1A] p-1 rounded-lg border border-[#333]">
          {(['combined', 'personal', 'business'] as AnalysisScope[]).map(s => (
            <button
              key={s}
              onClick={() => handleScopeChange(s)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 capitalize ${
                scope === s
                  ? 'bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/30'
                  : 'text-platinum/50 hover:text-platinum'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-platinum/30">
          {navigator.onLine
            ? <><Icon icon={Wifi} className="w-3 h-3 text-emerald-500" /> Online</>
            : <><Icon icon={WifiOff} className="w-3 h-3 text-soft-crimson" /> Offline — rule-based only</>
          }
        </div>
      </div>

      {/* ── No Data Empty State ── */}
      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="w-20 h-20 rounded-full bg-luxury-gold/10 border border-luxury-gold/20 flex items-center justify-center">
            <Icon icon={BarChart3} className="w-10 h-10 text-luxury-gold/50" />
          </div>
          <div className="text-center flex flex-col gap-2">
            <h3 className="text-xl font-bold text-platinum/70">No Financial Data Yet</h3>
            <p className="text-platinum/40 text-sm max-w-sm leading-relaxed">
              Log some transactions, subscriptions, or income sources first. The AI Advisor needs real data to provide meaningful analysis.
            </p>
          </div>
          <a
            href="/transactions"
            className="bg-luxury-gold text-obsidian px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-luxury-gold/90 transition-colors"
          >
            Add Your First Transaction
          </a>
        </div>
      ) : (
        <>
          {/* ── AI Report Header Card ── */}
          <div className="relative bg-[#0A0A0A]/70 border border-luxury-gold/20 rounded-2xl p-6 backdrop-blur-xl overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-luxury-gold/5 via-transparent to-transparent pointer-events-none" />

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-luxury-gold/10 border border-luxury-gold/30 flex items-center justify-center shrink-0">
                  <Icon icon={BrainCircuit} className="w-7 h-7 text-luxury-gold glow-gold" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-platinum">AI Financial Analysis</h2>
                    {aiReport && (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-2xl font-bold font-mono ${getScoreColor(aiReport.overallScore)}`}>
                          {aiReport.overallScore}/10
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getScoreColor(aiReport.overallScore)} bg-current/10`}>
                          {aiReport.scoreLabel}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-platinum/40 text-xs">
                    {aiReport
                      ? `Analyzed ${summary.periodLabel.toLowerCase()} · ${summary.transactionCount} transactions`
                      : `${summary.transactionCount} transactions ready for analysis · ${summary.periodLabel}`}
                  </p>
                  {lastGeneratedAt && (
                    <p className="text-platinum/30 text-xs">
                      Last analyzed: {lastGeneratedAt.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  onClick={handleGenerateAnalysis}
                  disabled={isLoading || cooldownRemaining > 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    isLoading || cooldownRemaining > 0
                      ? 'bg-[#1A1A1A] text-platinum/30 border border-[#333] cursor-not-allowed'
                      : 'bg-luxury-gold text-obsidian hover:bg-luxury-gold/90 hover:scale-[1.02] active:scale-100 shadow-lg shadow-luxury-gold/20'
                  }`}
                >
                  <Icon icon={isLoading ? Loader2 : Sparkles} className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading
                    ? 'Analyzing…'
                    : cooldownRemaining > 0
                    ? `Cooldown ${cooldownRemaining}s`
                    : aiReport
                    ? 'Re-analyze'
                    : 'Generate AI Analysis'}
                </button>
                {cooldownRemaining > 0 && (
                  <p className="text-xs text-platinum/30">Next analysis in {cooldownRemaining}s</p>
                )}
              </div>
            </div>

            {/* Executive Summary */}
            {aiReport?.executiveSummary && (
              <div className="mt-5 pt-5 border-t border-luxury-gold/10">
                <p className="text-platinum/70 text-sm leading-relaxed italic">
                  "{aiReport.executiveSummary}"
                </p>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && (
              <div className="mt-5 pt-5 border-t border-luxury-gold/10 flex flex-col gap-2">
                <div className="h-3 skeleton rounded w-full" />
                <div className="h-3 skeleton rounded w-4/5" />
                <div className="h-3 skeleton rounded w-3/5" />
              </div>
            )}
          </div>

          {/* ── Error Display ── */}
          {errorState.type !== 'none' && (
            <ErrorDisplay error={errorState} onRetry={handleRetry} />
          )}

          {/* ── Priority Actions (from AI) ── */}
          {aiReport?.priorityActions && aiReport.priorityActions.length > 0 && (
            <div className="bg-[#0A0A0A]/50 border border-luxury-gold/20 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowPriorityActions(!showPriorityActions)}
                className="w-full flex items-center justify-between p-4 hover:bg-luxury-gold/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon icon={CheckCircle2} className="w-4 h-4 text-luxury-gold" />
                  <span className="text-sm font-semibold text-platinum">Top Priority Actions</span>
                  <span className="bg-luxury-gold/20 text-luxury-gold text-xs font-bold px-2 py-0.5 rounded-full">
                    {aiReport.priorityActions.length}
                  </span>
                </div>
                <Icon icon={showPriorityActions ? ChevronUp : ChevronDown} className="w-4 h-4 text-platinum/30" />
              </button>
              {showPriorityActions && (
                <div className="px-4 pb-4 flex flex-col gap-2 animate-in fade-in duration-200">
                  {aiReport.priorityActions.map((action, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-luxury-gold/5 border border-luxury-gold/15">
                      <span className="w-5 h-5 rounded-full bg-luxury-gold/20 text-luxury-gold text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-platinum/80 leading-relaxed">{action}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Insight Cards ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-platinum/60 uppercase tracking-wider">
                  {aiReport ? 'AI Insights' : 'Quick Insights'}
                </h3>
                {!aiReport && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-platinum/10 text-platinum/40">
                    Rule-based · Generate AI analysis for deeper insights
                  </span>
                )}
              </div>
              <span className="text-xs text-platinum/30">{displayInsights.length} insights</span>
            </div>

            {displayInsights.length === 0 ? (
              <div className="p-8 text-center border border-[#222] rounded-xl bg-[#0A0A0A]/30">
                <Icon icon={CheckCircle2} className="w-8 h-8 text-luxury-gold mx-auto mb-3" />
                <p className="text-platinum/50 text-sm">No issues detected with the current data.</p>
              </div>
            ) : (
              displayInsights.map((insight, i) => (
                <InsightCard key={insight.id} insight={insight} index={i} />
              ))
            )}
          </div>

          {/* ── Projection Note (from AI) ── */}
          {aiReport?.projectionNote && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0A0A0A]/50 border border-platinum/10">
              <Icon icon={TrendingUp} className="w-4 h-4 text-platinum/40 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-platinum/30 uppercase tracking-wider block mb-1">Trajectory Projection</span>
                <p className="text-sm text-platinum/60 leading-relaxed italic">{aiReport.projectionNote}</p>
              </div>
            </div>
          )}

          {/* ── Data Transparency Panel ── */}
          <DataTransparencyPanel
            summary={summary}
            isOpen={showDataPanel}
            onToggle={() => setShowDataPanel(!showDataPanel)}
          />
        </>
      )}
    </div>
  );
};
