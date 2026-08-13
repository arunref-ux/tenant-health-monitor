import { calculateHealth } from "./health";
import { byPriority, priorityScore, severityFor } from "./prioritize";
import type {
  HealthScore,
  Opportunity,
  OpportunityEvidence,
  OpportunityLens,
  OpportunityType,
  Tenant,
  TenantAppUsage,
  TrendDirection,
} from "./types";

/**
 * Rule-based opportunity detection over the simulated Tenant/User/App/TTYB data.
 *
 *   Usage -> Adoption -> Signals -> Opportunity
 *
 * Detection lives here, prioritisation lives in `./prioritize`, and neither is
 * duplicated in the UI. Every opportunity carries evidence derived from actual
 * simulated numbers — no hard-coded narrative.
 */

/** Minimum eligible population before an app-level observation is meaningful. */
export const MIN_APP_POPULATION = 20;
/** App adoption below this is treated as a gap. */
export const APP_ADOPTION_GAP = 0.5;
/** Cross-app contrast must be at least this large to be reported. */
export const CROSS_APP_DELTA = 0.3;

const direction = (v: number): TrendDirection => (v > 0.03 ? "up" : v < -0.03 ? "down" : "flat");
const pct = (v: number) => `${Math.round(v * 100)}%`;

interface Draft {
  id: string;
  type: OpportunityType;
  lens: OpportunityLens;
  title: string;
  description: string;
  whyItMatters: string;
  evidence: OpportunityEvidence[];
  affectedUsers: number;
  gapRatio: number;
  trendPct: number;
  appIds?: string[];
  appNames?: string[];
}

export function detectOpportunities(tenant: Tenant, health?: HealthScore): Opportunity[] {
  const h = health ?? calculateHealth(tenant);
  const drafts: Draft[] = [
    ...activationGap(tenant),
    ...engagementGap(tenant),
    ...appAdoptionGaps(tenant),
    ...usageDecline(tenant),
    ...ttybAdoption(tenant),
    ...crossAppAdoption(tenant),
  ];

  return drafts
    .map((d) => {
      const score = priorityScore({
        type: d.type,
        affectedUsers: d.affectedUsers,
        gapRatio: d.gapRatio,
        trendPct: d.trendPct,
        healthCategory: h.category,
      });
      return {
        id: d.id,
        tenantId: tenant.id,
        tenantName: tenant.name,
        type: d.type,
        severity: severityFor(score),
        title: d.title,
        description: d.description,
        evidence: d.evidence,
        detectedAt: tenant.lastActivity,
        status: "Open",
        lens: d.lens,
        priorityScore: score,
        affectedUsers: d.affectedUsers,
        appIds: d.appIds ?? [],
        appNames: d.appNames ?? [],
        trendPct: d.trendPct,
        trend: direction(d.trendPct),
        healthCategory: h.category,
        healthScore: h.score,
        whyItMatters: d.whyItMatters,
      } satisfies Opportunity;
    })
    .sort(byPriority);
}

/* --------------------------------- rules -------------------------------- */

/** A. Activation Gap — eligible employees who never activated Aurumi. */
function activationGap(t: Tenant): Draft[] {
  const notActivated = t.employees - t.activatedUsers;
  const rate = t.activatedUsers / Math.max(1, t.employees);
  if (rate >= 0.8 || notActivated < 15) return [];
  return [
    {
      id: `${t.id}-activation`,
      type: "Activation Gap",
      lens: "Tenant",
      title: "Employees have not activated Aurumi",
      description: `${notActivated} of ${t.employees} employees have never activated Aurumi (${pct(rate)} activated).`,
      whyItMatters: `${notActivated} employees cannot use any Aurumi app or TTYB until they activate.`,
      evidence: [
        { label: "Employees", value: t.employees.toLocaleString() },
        { label: "Activated users", value: t.activatedUsers.toLocaleString() },
        { label: "Activation rate", value: pct(rate) },
        { label: "Not activated", value: notActivated.toLocaleString() },
      ],
      affectedUsers: notActivated,
      gapRatio: 1 - rate,
      trendPct: t.trendPct,
    },
  ];
}

/** B. Engagement Gap — activated users with no meaningful recent activity. */
function engagementGap(t: Tenant): Draft[] {
  if (t.inactiveUsers < 15) return [];
  const share = t.inactiveUsers / Math.max(1, t.activatedUsers);
  return [
    {
      id: `${t.id}-engagement`,
      type: "Engagement Gap",
      lens: "Tenant",
      title: "Activated users are not meaningfully active",
      description: `${t.inactiveUsers} activated users have had no Aurumi activity in the last 30 days (${pct(share)} of activated users).`,
      whyItMatters: `${t.inactiveUsers} of ${t.activatedUsers} activated users produced no usage in the observed period.`,
      evidence: [
        { label: "Activated users", value: t.activatedUsers.toLocaleString() },
        { label: "Monthly active", value: t.monthlyActiveUsers.toLocaleString() },
        { label: "Weekly active", value: t.weeklyActiveUsers.toLocaleString() },
        { label: "Dormant (30d)", value: t.inactiveUsers.toLocaleString() },
      ],
      affectedUsers: t.inactiveUsers,
      gapRatio: share,
      trendPct: t.trendPct,
    },
  ];
}

/** C. App Adoption Gap — meaningful eligible population, low active adoption. */
function appAdoptionGaps(t: Tenant): Draft[] {
  return t.apps
    .filter(
      (a) =>
        a.eligibleUsers >= MIN_APP_POPULATION &&
        a.adoption < APP_ADOPTION_GAP &&
        a.eligibleUsers - a.usage.direct.activeUsers >= 12,
    )
    .map((a) => {
      const gap = a.eligibleUsers - a.usage.direct.activeUsers;
      return {
        id: `${t.id}-app-${a.appId}`,
        type: "App Adoption Gap" as const,
        lens: "Aurumi" as const,
        title: `${a.appName} adoption gap`,
        description: `${a.appName}: ${pct(a.adoption)} adoption among ${a.eligibleUsers} eligible users.`,
        whyItMatters: `${gap} of ${a.eligibleUsers} eligible users have not actively used ${a.appName}.`,
        evidence: appEvidence(a),
        affectedUsers: gap,
        gapRatio: 1 - a.adoption,
        trendPct: a.trendPct,
        appIds: [a.appId],
        appNames: [a.appName],
      };
    });
}

function appEvidence(a: TenantAppUsage): OpportunityEvidence[] {
  return [
    { label: "Eligible users", value: a.eligibleUsers.toLocaleString() },
    { label: "Activated for app", value: a.usage.direct.activatedUsers.toLocaleString() },
    { label: "Active users", value: a.usage.direct.activeUsers.toLocaleString() },
    { label: "Adoption", value: pct(a.adoption) },
    { label: "30-day trend", value: `${a.trendPct >= 0 ? "+" : ""}${Math.round(a.trendPct * 100)}%` },
  ];
}

/** D. Usage Decline — tenant-wide, plus the app driving it. */
function usageDecline(t: Tenant): Draft[] {
  if (t.trendPct > -0.08) return [];
  const lost = Math.max(1, Math.round(t.monthlyActiveUsers * Math.abs(t.trendPct)));
  const worstApp = [...t.apps]
    .filter((a) => a.eligibleUsers >= MIN_APP_POPULATION)
    .sort((a, b) => a.trendPct - b.trendPct)[0];

  const evidence: OpportunityEvidence[] = [
    { label: "Monthly active users", value: t.monthlyActiveUsers.toLocaleString() },
    { label: "30-day change", value: `${Math.round(t.trendPct * 100)}%` },
    { label: "Estimated users lost", value: lost.toLocaleString() },
  ];
  if (worstApp)
    evidence.push({
      label: `Steepest app decline`,
      value: `${worstApp.appName} ${Math.round(worstApp.trendPct * 100)}%`,
      detail: `${worstApp.usage.direct.activeUsers} active of ${worstApp.eligibleUsers} eligible`,
    });

  return [
    {
      id: `${t.id}-decline`,
      type: "Usage Decline",
      lens: "Tenant",
      title: "Active usage declined over 30 days",
      description: `Active users fell ${Math.round(Math.abs(t.trendPct) * 100)}% over the last 30 days (~${lost} fewer active users).`,
      whyItMatters: `Usage is trending down from ${t.monthlyActiveUsers} monthly active users.`,
      evidence,
      affectedUsers: lost,
      gapRatio: Math.min(1, Math.abs(t.trendPct) / 0.3),
      trendPct: t.trendPct,
      appIds: worstApp ? [worstApp.appId] : [],
      appNames: worstApp ? [worstApp.appName] : [],
    },
  ];
}

/** E. TTYB Adoption — iteration 2 definitions unchanged. */
function ttybAdoption(t: Tenant): Draft[] {
  const ttyb = t.ttyb;
  if (!(t.appAdoption >= 0.5 && ttyb.adoption < 0.2 && t.activatedUsers >= 20)) return [];
  const reachable = Math.max(1, Math.round(t.activatedUsers * 0.35) - ttyb.users);
  return [
    {
      id: `${t.id}-ttyb-adoption`,
      type: "TTYB Adoption",
      lens: "Aurumi",
      title: "TTYB adoption lags direct app adoption",
      description: `${pct(t.appAdoption)} direct app adoption but only ${pct(ttyb.adoption)} TTYB adoption.`,
      whyItMatters: `${ttyb.users} of ${t.activatedUsers} activated users have used TTYB in the last 30 days.`,
      evidence: [
        { label: "Direct app adoption", value: pct(t.appAdoption) },
        { label: "TTYB adoption", value: pct(ttyb.adoption) },
        { label: "TTYB users (30d)", value: ttyb.users.toLocaleString() },
        { label: "TTYB interactions (30d)", value: ttyb.interactions.toLocaleString() },
        {
          label: "Extended reach",
          value: ttyb.extendedReachUsers.toLocaleString(),
          detail: "TTYB users with no recent direct app activity",
        },
      ],
      affectedUsers: reachable,
      gapRatio: 1 - Math.min(1, ttyb.adoption / 0.35),
      trendPct: ttyb.trendPct,
    },
  ];
}

/**
 * F. Cross-App Adoption — a meaningful contrast between two related apps.
 * Reported as an observation only; no causality is claimed.
 */
function crossAppAdoption(t: Tenant): Draft[] {
  const apps = t.apps.filter((a) => a.eligibleUsers >= MIN_APP_POPULATION);
  let best: { high: TenantAppUsage; low: TenantAppUsage; delta: number } | null = null;

  for (const high of apps) {
    for (const low of apps) {
      if (high.appId === low.appId) continue;
      const delta = high.adoption - low.adoption;
      if (high.adoption < 0.6 || low.adoption >= 0.45 || delta < CROSS_APP_DELTA) continue;
      if (!best || delta > best.delta) best = { high, low, delta };
    }
  }
  if (!best) return [];

  const gap = best.low.eligibleUsers - best.low.usage.direct.activeUsers;
  return [
    {
      id: `${t.id}-cross-${best.high.appId}-${best.low.appId}`,
      type: "Cross-App Adoption",
      lens: "Aurumi",
      title: `${best.low.appName} adoption is well below ${best.high.appName}`,
      description: `${best.high.appName} adoption is ${pct(best.high.adoption)}, while ${best.low.appName} adoption is ${pct(best.low.adoption)}.`,
      whyItMatters: `Both apps have meaningful eligible populations at this Tenant (${best.high.eligibleUsers} and ${best.low.eligibleUsers} users). This is an observed contrast, not a conclusion.`,
      evidence: [
        {
          label: best.high.appName,
          value: pct(best.high.adoption),
          detail: `${best.high.usage.direct.activeUsers} active of ${best.high.eligibleUsers} eligible`,
        },
        {
          label: best.low.appName,
          value: pct(best.low.adoption),
          detail: `${best.low.usage.direct.activeUsers} active of ${best.low.eligibleUsers} eligible`,
        },
        { label: "Adoption difference", value: `${Math.round(best.delta * 100)} pts` },
      ],
      affectedUsers: gap,
      gapRatio: best.delta,
      trendPct: best.low.trendPct,
      appIds: [best.high.appId, best.low.appId],
      appNames: [best.high.appName, best.low.appName],
    },
  ];
}
