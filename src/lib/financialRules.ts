/**
 * src/lib/financialRules.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Deterministic rule-based financial insight engine.
 * Runs instantly, zero API calls, zero latency, works fully offline.
 * Used as:
 *   1. Immediate insights while AI analysis loads
 *   2. Reliable fallback when the Gemini API is unavailable
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type InsightSeverity = 'critical' | 'warning' | 'opportunity' | 'tip';

export interface FinancialInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  metric?: string; // e.g. "38% of income"
  action?: string; // Specific actionable step
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  savingsRate: number; // percentage 0-100
  topCategories: { name: string; amount: number; percentage: number }[];
  subscriptionBurnMonthly: number;
  subscriptionCount: number;
  incomeSourceCount: number;
  transactionCount: number;
  currency: string;
  scope: 'personal' | 'business' | 'combined';
  periodLabel: string; // e.g. "Last 90 days"
}

/**
 * Generates deterministic financial insights from aggregated summary data.
 * All thresholds are based on established personal finance principles
 * (50/30/20 rule, emergency fund guidelines, etc.)
 */
export function generateRuleBasedInsights(summary: FinancialSummary): FinancialInsight[] {
  const insights: FinancialInsight[] = [];
  const { totalIncome, totalExpenses, netCashFlow, savingsRate, topCategories,
          subscriptionBurnMonthly, subscriptionCount, incomeSourceCount,
          transactionCount, currency } = summary;

  // Guard: need at least some data
  if (transactionCount === 0) return [];

  // ── 1. CASH FLOW — Critical checks ──────────────────────────────────────
  if (totalIncome === 0 && totalExpenses > 0) {
    insights.push({
      id: 'no-income',
      severity: 'critical',
      title: 'No Income Recorded',
      detail: `You have recorded ${currency}${totalExpenses.toFixed(0)} in expenses but no income sources. This may be a data gap — ensure your income streams are logged.`,
      action: 'Log all income sources in the Inflows section to get accurate analysis.',
    });
    return insights; // No point running further rules without income
  }

  if (netCashFlow < 0 && totalIncome > 0) {
    const deficit = Math.abs(netCashFlow);
    insights.push({
      id: 'negative-cashflow',
      severity: 'critical',
      title: 'Negative Cash Flow Detected',
      detail: `Your expenses exceed your income by ${currency}${deficit.toFixed(2)}. You are spending more than you earn, which depletes savings and builds financial vulnerability.`,
      metric: `-${currency}${deficit.toFixed(2)} deficit`,
      action: 'Identify the top 2 expense categories and set a hard limit for next month.',
    });
  }

  // ── 2. SAVINGS RATE ──────────────────────────────────────────────────────
  if (totalIncome > 0) {
    if (savingsRate < 0) {
      // Already covered by negative cash flow rule
    } else if (savingsRate < 10) {
      insights.push({
        id: 'low-savings',
        severity: 'critical',
        title: 'Dangerously Low Savings Rate',
        detail: `Your savings rate is ${savingsRate.toFixed(1)}%. Financial experts recommend a minimum of 20% (50/30/20 rule). At this rate, a single unexpected expense could cause serious financial stress.`,
        metric: `${savingsRate.toFixed(1)}% savings rate`,
        action: 'Try automating a fixed transfer to savings on payday — even 5% is a start.',
      });
    } else if (savingsRate < 20) {
      insights.push({
        id: 'below-target-savings',
        severity: 'warning',
        title: 'Savings Rate Below Target',
        detail: `Your savings rate is ${savingsRate.toFixed(1)}%. The recommended benchmark is 20%. You're in the right direction but have room to improve.`,
        metric: `${savingsRate.toFixed(1)}% vs 20% target`,
        action: 'Review your "Wants" spending category and aim to redirect 5% more to savings.',
      });
    } else if (savingsRate >= 30) {
      insights.push({
        id: 'strong-savings',
        severity: 'opportunity',
        title: 'Strong Savings Rate',
        detail: `Excellent — your savings rate is ${savingsRate.toFixed(1)}%, well above the 20% benchmark. Consider putting excess savings to work in investments rather than letting them sit idle.`,
        metric: `${savingsRate.toFixed(1)}% savings rate`,
        action: 'Consider allocating excess savings to index funds or other growth instruments.',
      });
    }
  }

  // ── 3. EXPENSE CATEGORY CONCENTRATION ────────────────────────────────────
  if (totalExpenses > 0 && topCategories.length > 0) {
    const topCategory = topCategories[0];
    if (topCategory.percentage > 40) {
      insights.push({
        id: 'category-dominance',
        severity: 'warning',
        title: `"${topCategory.name}" Dominates Your Spending`,
        detail: `"${topCategory.name}" accounts for ${topCategory.percentage.toFixed(1)}% of total expenses (${currency}${topCategory.amount.toFixed(2)}). Heavy concentration in one category creates financial rigidity and risk.`,
        metric: `${topCategory.percentage.toFixed(1)}% of expenses`,
        action: `Audit your "${topCategory.name}" transactions and identify what can be reduced or renegotiated.`,
      });
    } else if (topCategory.percentage > 30) {
      insights.push({
        id: 'category-concentration',
        severity: 'tip',
        title: `"${topCategory.name}" is Your Largest Expense`,
        detail: `"${topCategory.name}" represents ${topCategory.percentage.toFixed(1)}% of expenses. While not alarming, keep an eye on this category to prevent it from growing further.`,
        metric: `${topCategory.percentage.toFixed(1)}% of expenses`,
        action: `Set a monthly budget cap for "${topCategory.name}" to maintain control.`,
      });
    }
  }

  // ── 4. SUBSCRIPTION BLOAT ────────────────────────────────────────────────
  if (subscriptionCount > 0 && totalIncome > 0) {
    const subscriptionRatio = (subscriptionBurnMonthly / totalIncome) * 100;
    if (subscriptionRatio > 20) {
      insights.push({
        id: 'subscription-bloat',
        severity: 'warning',
        title: 'Subscription Overload',
        detail: `Your ${subscriptionCount} active subscriptions cost ${currency}${subscriptionBurnMonthly.toFixed(2)}/month — ${subscriptionRatio.toFixed(1)}% of your income. Subscription creep is a silent budget killer.`,
        metric: `${subscriptionRatio.toFixed(1)}% of income`,
        action: 'Cancel any subscription you haven\'t actively used in the past 30 days.',
      });
    } else if (subscriptionCount >= 5 && subscriptionRatio > 10) {
      insights.push({
        id: 'subscription-review',
        severity: 'tip',
        title: 'Review Your Subscriptions',
        detail: `You have ${subscriptionCount} active subscriptions totaling ${currency}${subscriptionBurnMonthly.toFixed(2)}/month. Periodic review prevents accumulation of unused services.`,
        metric: `${subscriptionCount} active subscriptions`,
        action: 'Schedule a quarterly subscription audit — cancel what you don\'t actively use.',
      });
    }
  }

  // ── 5. INCOME DIVERSIFICATION ────────────────────────────────────────────
  if (incomeSourceCount === 1) {
    insights.push({
      id: 'single-income',
      severity: 'warning',
      title: 'Single Income Source Risk',
      detail: 'You rely on a single income stream. Financial resilience experts recommend at least 2-3 income sources to protect against unexpected income loss (job loss, contract end, etc.).',
      metric: '1 income source',
      action: 'Explore a complementary income stream — freelancing, passive income, or a side skill.',
    });
  } else if (incomeSourceCount >= 3) {
    insights.push({
      id: 'diversified-income',
      severity: 'opportunity',
      title: 'Well-Diversified Income',
      detail: `You have ${incomeSourceCount} active income sources. This is excellent for financial resilience. Focus on growing the highest-margin source.`,
      metric: `${incomeSourceCount} income streams`,
      action: 'Identify which income source has the best effort-to-return ratio and double down on it.',
    });
  }

  // ── 6. POSITIVE CASH FLOW OPPORTUNITY ───────────────────────────────────
  if (netCashFlow > 0 && savingsRate >= 20 && totalIncome > 0) {
    const surplusMonthly = netCashFlow; // Approximate
    insights.push({
      id: 'surplus-opportunity',
      severity: 'opportunity',
      title: 'Healthy Surplus — Put It to Work',
      detail: `You have a positive cash flow of ${currency}${surplusMonthly.toFixed(2)}. Rather than letting this accumulate in a low-yield account, deploy it strategically.`,
      metric: `+${currency}${surplusMonthly.toFixed(2)} surplus`,
      action: 'Allocate surplus into: emergency fund (3-6 months expenses), then investments.',
    });
  }

  // ── 7. DATA QUALITY TIPS ─────────────────────────────────────────────────
  if (transactionCount < 5) {
    insights.push({
      id: 'low-data',
      severity: 'tip',
      title: 'More Data = Better Insights',
      detail: `Only ${transactionCount} transaction(s) recorded. Financial analysis becomes significantly more accurate and actionable with at least 30 days of consistent data.`,
      metric: `${transactionCount} transactions logged`,
      action: 'Log all transactions consistently for 30 days to unlock meaningful trend analysis.',
    });
  }

  return insights;
}

/**
 * Severity sort order for display priority
 */
const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  opportunity: 2,
  tip: 3,
};

export function sortInsightsBySeverity(insights: FinancialInsight[]): FinancialInsight[] {
  return [...insights].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
