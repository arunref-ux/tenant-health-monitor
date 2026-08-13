import { APPS } from "./catalog";
import { CROSS_APP_DELTA, MIN_APP_POPULATION } from "./opportunities";
import type {
  AdoptionIntelligence,
  AdoptionThresholds,
  AppAdoptionDetail,
  AppAdoptionRow,
  AppTenantAdoption,
  CrossAppPattern,
  TenantRecord,
  TrendDirection,
  UsagePoint,
} from "./types";

/**
 * Aurumi lens — how each part of Aurumi is adopted across the Tenant base.
 * Pure aggregation over the same Tenant records the Tenant and Portfolio
 * lenses use; no separate data model and no UI-side maths.
 */

/** Adoption buckets used across the Aurumi lens. Configurable in one place. */
export const ADOPTION_THRESHOLDS: AdoptionThresholds = { high: 0.6, medium: 0.35 };

export function adoptionBand(
  adoption: number,
  t: AdoptionThresholds = ADOPTION_THRESHOLDS,
): "high" | "medium" | "low" {
  if (adoption >= t.high) return "high";
  if (adoption >= t.medium) return "medium";
  return "low";
}

const direction = (v: number): TrendDirection => (v > 0.03 ? "up" : v < -0.03 ? "down" : "flat");

export function buildAppRow(
  records: TenantRecord[],
  appId: string,
  thresholds: AdoptionThresholds = ADOPTION_THRESHOLDS,
): AppAdoptionRow {
  const app = APPS.find((a) => a.id === appId)!;
  const rows = tenantRowsForApp(records, appId);
  const withAccess = rows.filter((r) => r.eligibleUsers > 0);

  const eligibleUsers = sum(withAccess, (r) => r.eligibleUsers);
  const activatedUsers = sum(withAccess, (r) => r.activatedUsers);
  const activeUsers = sum(withAccess, (r) => r.activeUsers);
  const trendPct = weightedAverage(
    withAccess.map((r) => [r.trendPct, r.eligibleUsers] as const),
  );
  const distribution = { high: 0, medium: 0, low: 0 };
  for (const r of withAccess) distribution[adoptionBand(r.adoption, thresholds)]++;

  return {
    appId,
    appName: app.name,
    category: app.category,
    tenantsWithAccess: withAccess.length,
    eligibleUsers,
    activatedUsers,
    activeUsers,
    adoption: eligibleUsers ? activeUsers / eligibleUsers : 0,
    trendPct: Math.round(trendPct * 100) / 100,
    trend: direction(trendPct),
    tenantsWithGap: withAccess.filter(
      (r) => r.eligibleUsers >= MIN_APP_POPULATION && adoptionBand(r.adoption, thresholds) === "low",
    ).length,
    distribution,
  };
}

export function buildAppDetail(
  records: TenantRecord[],
  appId: string,
  thresholds: AdoptionThresholds = ADOPTION_THRESHOLDS,
): AppAdoptionDetail {
  const row = buildAppRow(records, appId, thresholds);
  const tenants = tenantRowsForApp(records, appId)
    .filter((r) => r.eligibleUsers > 0)
    .sort((a, b) => b.gapUsers - a.gapUsers);

  return { ...row, thresholds, tenants, trendSeries: appTrendSeries(records, appId) };
}

/**
 * Portfolio-level daily series for one app. Tenant history shape is reused and
 * scaled by the app's share of the Tenant's active users — coherent with the
 * existing simulation rather than a second dataset.
 */
export function appTrendSeries(records: TenantRecord[], appId: string): UsagePoint[] {
  const days = records[0]?.history.length ?? 0;
  const eligibleTotal = records.reduce(
    (s, t) => s + (t.apps.find((a) => a.appId === appId)?.eligibleUsers ?? 0),
    0,
  );

  return Array.from({ length: days }, (_, i) => {
    let active = 0;
    for (const t of records) {
      const app = t.apps.find((a) => a.appId === appId);
      if (!app || !app.eligibleUsers) continue;
      const share = app.usage.direct.activeUsers / Math.max(1, t.monthlyActiveUsers);
      active += (t.history[i]?.activeUsers ?? 0) * share;
    }
    return {
      date: records[0]?.history[i]?.date ?? "",
      activeUsers: Math.round(active),
      adoption: eligibleTotal ? Math.min(1, active / eligibleTotal) : 0,
    };
  });
}

function tenantRowsForApp(records: TenantRecord[], appId: string): AppTenantAdoption[] {
  return records.flatMap((t) => {
    const app = t.apps.find((a) => a.appId === appId);
    if (!app) return [];
    return [
      {
        tenantId: t.id,
        tenantName: t.name,
        industry: t.industry,
        eligibleUsers: app.eligibleUsers,
        activatedUsers: app.usage.direct.activatedUsers,
        activeUsers: app.usage.direct.activeUsers,
        adoption: app.adoption,
        gapUsers: Math.max(0, app.eligibleUsers - app.usage.direct.activeUsers),
        trendPct: app.trendPct,
        trend: app.trend,
        healthCategory: t.health.category,
        healthScore: t.health.score,
      } satisfies AppTenantAdoption,
    ];
  });
}

/**
 * Cross-app adoption contrasts across the portfolio. Only pairs where both
 * apps have meaningful eligible populations and the difference is significant.
 * Presented as an adoption pattern, never as a causal recommendation.
 */
/** Minimum portfolio-level adoption gap for a cross-app pattern to be reported. */
export const PORTFOLIO_CROSS_APP_DELTA = 0.15;

export function crossAppPatterns(
  records: TenantRecord[],
  thresholds: AdoptionThresholds = ADOPTION_THRESHOLDS,
  limit = 6,
): CrossAppPattern[] {
  const rows = APPS.map((a) => buildAppRow(records, a.id, thresholds)).filter(
    (r) => r.eligibleUsers >= MIN_APP_POPULATION * 4,
  );

  const patterns: CrossAppPattern[] = [];
  for (const high of rows) {
    for (const low of rows) {
      if (high.appId === low.appId) continue;
      const delta = high.adoption - low.adoption;
      // Portfolio-wide adoption is averaged across Tenants, so it is flatter
      // than any single Tenant's adoption. Use a portfolio delta here and keep
      // the stricter CROSS_APP_DELTA for counting affected Tenants.
      if (delta < PORTFOLIO_CROSS_APP_DELTA) continue;
      if (high.adoption < thresholds.medium) continue;
      if (adoptionBand(low.adoption, thresholds) === "high") continue;

      const tenantsAffected = records.filter((t) => {
        const a = t.apps.find((x) => x.appId === high.appId);
        const b = t.apps.find((x) => x.appId === low.appId);
        return (
          a &&
          b &&
          a.eligibleUsers >= MIN_APP_POPULATION &&
          b.eligibleUsers >= MIN_APP_POPULATION &&
          a.adoption - b.adoption >= CROSS_APP_DELTA
        );
      }).length;
      if (tenantsAffected === 0) continue;

      patterns.push({
        id: `${high.appId}-vs-${low.appId}`,
        appAId: high.appId,
        appAName: high.appName,
        appAAdoption: high.adoption,
        appBId: low.appId,
        appBName: low.appName,
        appBAdoption: low.adoption,
        delta,
        pattern: `${high.appName} strong · ${low.appName} weak`,
        tenantsAffected,
        description: `${high.appName} adoption is ${pct(high.adoption)}, while ${low.appName} adoption is ${pct(low.adoption)}.`,
      });
    }
  }

  return patterns.sort((a, b) => b.delta - a.delta).slice(0, limit);
}

export function buildAdoptionIntelligence(
  records: TenantRecord[],
  thresholds: AdoptionThresholds = ADOPTION_THRESHOLDS,
): AdoptionIntelligence {
  const apps = APPS.map((a) => buildAppRow(records, a.id, thresholds)).sort(
    (a, b) => a.adoption - b.adoption,
  );
  const eligibleUsers = sum(apps, (a) => a.eligibleUsers);
  const activeUsers = sum(apps, (a) => a.activeUsers);

  return {
    thresholds,
    apps,
    patterns: crossAppPatterns(records, thresholds),
    totals: {
      eligibleUsers,
      activeUsers,
      adoption: eligibleUsers ? activeUsers / eligibleUsers : 0,
      tenants: records.length,
    },
  };
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

function sum<T>(rows: T[], fn: (row: T) => number): number {
  return rows.reduce((s, r) => s + fn(r), 0);
}

function weightedAverage(pairs: ReadonlyArray<readonly [number, number]>): number {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  if (!total) return 0;
  return pairs.reduce((s, [v, w]) => s + v * w, 0) / total;
}
