import type { HealthCategory, HealthScore, HealthSignal, Tenant } from "./types";

/**
 * Provisional Tenant health model — intentionally simple and easy to retune.
 *
 *   Health = Activation (25) + Engagement (30) + Adoption (30) + Trend (15)
 */
export const HEALTH_WEIGHTS = { activation: 25, engagement: 30, adoption: 30, trend: 15 };

export function categorize(score: number): HealthCategory {
  if (score >= 75) return "Healthy";
  if (score >= 55) return "Watch";
  return "At Risk";
}

export function calculateHealth(tenant: Tenant): HealthScore {
  const activationRate = tenant.employees ? tenant.activatedUsers / tenant.employees : 0;
  const engagementRate = tenant.activatedUsers
    ? tenant.weeklyActiveUsers / tenant.activatedUsers
    : 0;
  const adoption = tenant.appAdoption;
  // -20% => 0, 0% => ~half, +20% => full
  const trendNorm = Math.min(1, Math.max(0, (tenant.trendPct + 0.2) / 0.4));

  const components = {
    activation: round1(Math.min(1, activationRate / 0.9) * HEALTH_WEIGHTS.activation),
    engagement: round1(Math.min(1, engagementRate / 0.75) * HEALTH_WEIGHTS.engagement),
    adoption: round1(Math.min(1, adoption / 0.8) * HEALTH_WEIGHTS.adoption),
    trend: round1(trendNorm * HEALTH_WEIGHTS.trend),
  };

  const score = Math.round(
    components.activation + components.engagement + components.adoption + components.trend,
  );

  const positives: HealthSignal[] = [];
  const negatives: HealthSignal[] = [];

  const push = (
    ok: boolean,
    label: string,
    detail: string,
  ) => (ok ? positives : negatives).push({ label, detail });

  push(
    activationRate >= 0.7,
    "Employee activation",
    `${Math.round(activationRate * 100)}% of ${tenant.employees} employees activated`,
  );
  push(
    engagementRate >= 0.6,
    "Weekly engagement",
    `${Math.round(engagementRate * 100)}% of activated users active this week`,
  );
  push(
    adoption >= 0.6,
    "App adoption",
    `${Math.round(adoption * 100)}% weighted adoption across eligible users`,
  );
  push(
    tenant.trendPct >= 0,
    "30-day usage trend",
    `${formatPct(tenant.trendPct)} change in active users`,
  );

  const weakest = [...tenant.apps].sort((a, b) => a.adoption - b.adoption)[0];
  if (weakest && weakest.adoption < 0.45) {
    negatives.push({
      label: `${weakest.appName} underused`,
      detail: `${Math.round(weakest.adoption * 100)}% adoption of ${weakest.eligibleUsers} eligible users`,
    });
  }
  const strongest = [...tenant.apps].sort((a, b) => b.adoption - a.adoption)[0];
  if (strongest && strongest.adoption >= 0.75) {
    positives.push({
      label: `${strongest.appName} well adopted`,
      detail: `${Math.round(strongest.adoption * 100)}% of eligible users active`,
    });
  }

  return { score, category: categorize(score), components, positives, negatives };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
export const formatPct = (n: number) => `${n >= 0 ? "+" : ""}${Math.round(n * 100)}%`;
