import {
  ADOPTION_THRESHOLDS,
  buildAdoptionIntelligence,
  buildAppDetail,
} from "@/domain/adoption-intelligence";
import { buildTenants, todayISO } from "@/domain/generator";
import { calculateHealth } from "@/domain/health";
import { detectOpportunities } from "@/domain/opportunities";
import { byPriority, severityRank } from "@/domain/prioritize";
import { extendedReachBucket, ttybAdoptionBucket } from "@/domain/ttyb";
import type {
  AdoptionIntelligence,
  AppAdoptionDetail,
  HealthCategory,
  Opportunity,
  OpportunityFilters,
  OpportunityStatus,
  OpportunitySummary,
  OverviewSummary,
  PortfolioFilters,
  PortfolioSignal,
  TenantRecord,
  TtybOverview,
  TtybPoint,
  UsagePoint,
} from "@/domain/types";

/**
 * Simulated backend. The UI only ever talks to this async interface, so it can
 * later be swapped for real Aurumi APIs without touching components.
 *
 * All intelligence (health, opportunities, adoption aggregation) is computed in
 * the domain layer and surfaced here — never recomputed inside components.
 */
export interface TenantSuccessProvider {
  getOverview(): Promise<OverviewSummary>;
  listTenants(filters?: PortfolioFilters): Promise<TenantRecord[]>;
  getTenant(id: string): Promise<TenantRecord>;
  listOpportunities(filters?: OpportunityFilters): Promise<Opportunity[]>;
  getOpportunity(id: string): Promise<Opportunity>;
  setOpportunityStatus(id: string, status: OpportunityStatus): Promise<Opportunity>;
  getAdoptionIntelligence(): Promise<AdoptionIntelligence>;
  getAppAdoption(appId: string): Promise<AppAdoptionDetail>;
}

const LATENCY_MS = 350;

/** Set to a number 0..1 to simulate provider failures (used by error states). */
export const simulatedFailureRate = 0;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (simulatedFailureRate > 0 && Math.random() < simulatedFailureRate) {
        reject(new Error("Tenant Success data provider is unavailable"));
        return;
      }
      resolve(value);
    }, LATENCY_MS);
  });
}

const cache = new Map<string, TenantRecord[]>();

/**
 * Opportunity status overrides. Iteration 3 supports Open / Dismissed only —
 * no assignment, tasks or intervention workflow.
 */
const statusOverrides = new Map<string, OpportunityStatus>();

export function resetOpportunityStatuses() {
  statusOverrides.clear();
}

function withStatus(o: Opportunity): Opportunity {
  const override = statusOverrides.get(o.id);
  return override ? { ...o, status: override } : o;
}

/**
 * Simulated as-of date. Data is deterministic for a given seed + as-of date,
 * and defaults to today so the prototype never shows stale dates.
 */
export function buildDataset(asOfDate: string = todayISO()): TenantRecord[] {
  const cached = cache.get(asOfDate);
  if (cached) return cached;
  const records = buildTenants({ asOfDate }).map((tenant) => {
    const health = calculateHealth(tenant);
    return { ...tenant, health, opportunities: detectOpportunities(tenant, health) };
  });
  cache.set(asOfDate, records);
  return records;
}

function dataset(): TenantRecord[] {
  return buildDataset().map((t) => ({ ...t, opportunities: t.opportunities.map(withStatus) }));
}

function adoptionBucket(v: number) {
  if (v >= 0.7) return "high";
  if (v >= 0.45) return "medium";
  return "low";
}

export function applyFilters(records: TenantRecord[], f: PortfolioFilters = {}): TenantRecord[] {
  const search = (f.search ?? "").trim().toLowerCase();
  let rows = records.filter((t) => {
    if (search && !`${t.name} ${t.industry}`.toLowerCase().includes(search)) return false;
    if (f.health && f.health !== "all" && t.health.category !== f.health) return false;
    if (f.industry && f.industry !== "all" && t.industry !== f.industry) return false;
    if (f.adoption && f.adoption !== "all" && adoptionBucket(t.appAdoption) !== f.adoption)
      return false;
    if (f.trend && f.trend !== "all" && t.trend !== f.trend) return false;
    if (
      f.ttybAdoption &&
      f.ttybAdoption !== "all" &&
      ttybAdoptionBucket(t.ttyb.adoption) !== f.ttybAdoption
    )
      return false;
    if (
      f.extendedReach &&
      f.extendedReach !== "all" &&
      extendedReachBucket(t.ttyb.extendedReachUsers, t.activatedUsers) !== f.extendedReach
    )
      return false;
    if (f.ttybTrend && f.ttybTrend !== "all" && t.ttyb.trend !== f.ttybTrend) return false;
    return true;
  });

  const dir = f.sortDir === "asc" ? 1 : -1;
  const key = f.sortBy ?? "health";
  rows = [...rows].sort((a, b) => {
    const get = (t: TenantRecord) => {
      switch (key) {
        case "name":
          return t.name.toLowerCase();
        case "health":
          return t.health.score;
        case "opportunities":
          return t.opportunities.filter((o) => o.status === "Open").length;
        case "ttybUsers":
          return t.ttyb.users;
        case "ttybAdoption":
          return t.ttyb.adoption;
        case "ttybExtendedReach":
          return t.ttyb.extendedReachUsers;
        case "ttybInteractions":
          return t.ttyb.interactions;
        case "ttybTrend":
          return t.ttyb.trendPct;
        default:
          return t[key] as number;
      }
    };
    const av = get(a);
    const bv = get(b);
    if (typeof av === "string" || typeof bv === "string")
      return String(av).localeCompare(String(bv)) * dir;
    return (av - bv) * dir;
  });
  return rows;
}

/* ----------------------------- opportunities ----------------------------- */

export function allOpportunities(records: TenantRecord[]): Opportunity[] {
  return records.flatMap((t) => t.opportunities);
}

export function applyOpportunityFilters(
  opportunities: Opportunity[],
  f: OpportunityFilters = {},
): Opportunity[] {
  const search = (f.search ?? "").trim().toLowerCase();
  const rows = opportunities.filter((o) => {
    if (
      search &&
      !`${o.title} ${o.tenantName} ${o.type} ${o.description}`.toLowerCase().includes(search)
    )
      return false;
    if (f.type && f.type !== "all" && o.type !== f.type) return false;
    if (f.severity && f.severity !== "all" && o.severity !== f.severity) return false;
    if (f.status && f.status !== "all" && o.status !== f.status) return false;
    if (f.tenantId && f.tenantId !== "all" && o.tenantId !== f.tenantId) return false;
    if (f.lens && f.lens !== "all" && o.lens !== f.lens) return false;
    if (f.appId && !o.appIds.includes(f.appId)) return false;
    return true;
  });

  const dir = f.sortDir === "asc" ? 1 : -1;
  const sortBy = f.sortBy ?? "priority";
  return [...rows].sort((a, b) => {
    switch (sortBy) {
      case "severity":
        return (severityRank(a.severity) - severityRank(b.severity)) * (dir === 1 ? 1 : -1) * -1;
      case "affectedUsers":
        return (a.affectedUsers - b.affectedUsers) * dir;
      case "tenant":
        return a.tenantName.localeCompare(b.tenantName) * dir;
      case "type":
        return a.type.localeCompare(b.type) * dir;
      case "detected":
        return a.detectedAt.localeCompare(b.detectedAt) * dir;
      default:
        return dir === 1 ? -byPriority(a, b) : byPriority(a, b);
    }
  });
}

export function summariseOpportunities(opportunities: Opportunity[]): OpportunitySummary {
  const open = opportunities.filter((o) => o.status === "Open");
  return {
    open: open.length,
    dismissed: opportunities.length - open.length,
    highSeverity: open.filter((o) => o.severity === "High").length,
    tenantsAffected: new Set(open.map((o) => o.tenantId)).size,
    trendingUp: open.filter((o) => o.trend === "down").length,
  };
}

/* -------------------------------- overview ------------------------------- */

function buildOverview(records: TenantRecord[]): OverviewSummary {
  const count = (c: HealthCategory) => records.filter((t) => t.health.category === c).length;
  const totalEmployees = records.reduce((s, t) => s + t.employees, 0);
  const activeUsers = records.reduce((s, t) => s + t.monthlyActiveUsers, 0);
  const activatedUsers = records.reduce((s, t) => s + t.activatedUsers, 0);
  const weeklyActive = records.reduce((s, t) => s + t.weeklyActiveUsers, 0);
  const totalEligible = records.reduce(
    (s, t) => s + t.apps.reduce((x, a) => x + a.eligibleUsers, 0),
    0,
  );
  const totalAppActive = records.reduce(
    (s, t) => s + t.apps.reduce((x, a) => x + a.usage.direct.activeUsers, 0),
    0,
  );

  // Aggregate the portfolio trend day by day from tenant histories.
  const days = records[0]?.history.length ?? 0;
  const trend: UsagePoint[] = Array.from({ length: days }, (_, i) => {
    const active = records.reduce((s, t) => s + (t.history[i]?.activeUsers ?? 0), 0);
    const adoption =
      records.reduce((s, t) => s + (t.history[i]?.adoption ?? 0) * t.employees, 0) /
      Math.max(1, totalEmployees);
    return { date: records[0]?.history[i]?.date ?? "", activeUsers: active, adoption };
  });

  const attention = records
    .filter((t) => t.health.category !== "Healthy")
    .sort((a, b) => a.health.score - b.health.score)
    .slice(0, 6)
    .map((t) => {
      const top = [...t.opportunities].filter((o) => o.status === "Open").sort(byPriority)[0];
      return {
        tenantId: t.id,
        tenantName: t.name,
        category: t.health.category,
        score: t.health.score,
        trendPct: t.trendPct,
        reason: top ? top.title : (t.health.negatives[0]?.label ?? "Health below threshold"),
        suggestion: suggestionFor(top?.type),
      };
    });

  const ttyb = buildTtybOverview(records);
  const opportunities = allOpportunities(records);
  const openOpportunities = opportunities.filter((o) => o.status === "Open");
  const topOpportunities = [...openOpportunities].sort(byPriority).slice(0, 5);

  return {
    totalTenants: records.length,
    healthyTenants: count("Healthy"),
    watchTenants: count("Watch"),
    atRiskTenants: count("At Risk"),
    totalEmployees,
    activeUsers,
    averageAdoption: totalAppActive / Math.max(1, totalEligible),
    openOpportunities: openOpportunities.length,
    trend,
    attention,
    topOpportunities,
    ttyb,
    activationRate: activatedUsers / Math.max(1, totalEmployees),
    engagementRate: weeklyActive / Math.max(1, activatedUsers),
    opportunities: summariseOpportunities(opportunities),
    signals: buildPortfolioSignals(records, openOpportunities),
  };
}

/**
 * Portfolio lens signals. Every signal is derived from the same intelligence
 * the other lenses use, and points at a drilldown target.
 */
export function buildPortfolioSignals(
  records: TenantRecord[],
  openOpportunities: Opportunity[],
): PortfolioSignal[] {
  const signals: PortfolioSignal[] = [];
  const intelligence = buildAdoptionIntelligence(records);

  for (const app of intelligence.apps) {
    if (app.tenantsWithGap >= 3) {
      signals.push({
        id: `app-${app.appId}`,
        label: `${app.appName} adoption is below ${Math.round(ADOPTION_THRESHOLDS.medium * 100)}% in ${app.tenantsWithGap} Tenants`,
        detail: `${Math.round(app.adoption * 100)}% portfolio adoption across ${app.eligibleUsers.toLocaleString()} eligible users.`,
        tone: app.tenantsWithGap >= 8 ? "danger" : "warning",
        appId: app.appId,
        target: "adoption",
      });
    }
  }

  const declining = records.filter((t) => t.trendPct <= -0.08).length;
  if (declining > 0)
    signals.push({
      id: "declining-engagement",
      label: `${declining} Tenants show declining engagement over 30 days`,
      detail: "Active users fell by 8% or more compared with the start of the period.",
      tone: declining >= records.length / 3 ? "danger" : "warning",
      target: "tenants",
    });

  const activationGaps = openOpportunities.filter((o) => o.type === "Activation Gap").length;
  if (activationGaps > 0)
    signals.push({
      id: "activation-gaps",
      label: `${activationGaps} Tenants have significant activation gaps`,
      detail: "Fewer than 80% of employees have activated Aurumi.",
      tone: "warning",
      target: "opportunities",
    });

  const ttybGaps = openOpportunities.filter((o) => o.type === "TTYB Adoption").length;
  if (ttybGaps > 0)
    signals.push({
      id: "ttyb-gaps",
      label: `${ttybGaps} Tenants use Aurumi Apps well but barely use TTYB`,
      detail: "Direct app adoption is at or above 50% while TTYB adoption is below 20%.",
      tone: "default",
      target: "ttyb",
    });

  return signals
    .sort((a, b) => toneRank(a.tone) - toneRank(b.tone))
    .slice(0, 6);
}

const toneRank = (tone: PortfolioSignal["tone"]) =>
  tone === "danger" ? 0 : tone === "warning" ? 1 : 2;

/** Portfolio TTYB rollup. Adoption uses activated users as the denominator. */
export function buildTtybOverview(records: TenantRecord[]): TtybOverview {
  const sum = (fn: (t: TenantRecord) => number) => records.reduce((s, t) => s + fn(t), 0);
  const activated = sum((t) => t.activatedUsers);
  const users = sum((t) => t.ttyb.users);
  const days = records[0]?.ttyb.history.length ?? 0;
  const trend: TtybPoint[] = Array.from({ length: days }, (_, i) => ({
    date: records[0]?.ttyb.history[i]?.date ?? "",
    users: sum((t) => t.ttyb.history[i]?.users ?? 0),
    interactions: sum((t) => t.ttyb.history[i]?.interactions ?? 0),
  }));

  const first = trend[0]?.users ?? 0;
  const last = trend[trend.length - 1]?.users ?? 0;
  const growthPct = first ? Math.round(((last - first) / first) * 100) / 100 : 0;

  const lowTtybHighApp = records.filter((t) => t.appAdoption >= 0.5 && t.ttyb.adoption < 0.2).length;
  const ttybButDeclining = records.filter((t) => t.ttyb.adoption >= 0.15 && t.trendPct <= -0.08)
    .length;
  const decliningTtyb = records.filter((t) => t.ttyb.trend === "down").length;

  const signals: TtybOverview["signals"] = [];
  if (lowTtybHighApp > 0)
    signals.push({
      label: `${lowTtybHighApp} Tenants have high Aurumi adoption but low TTYB adoption`,
      detail: "Direct app usage is healthy; TTYB has not been introduced widely yet.",
      tone: "warning",
    });
  if (ttybButDeclining > 0)
    signals.push({
      label: `${ttybButDeclining} Tenants have meaningful TTYB usage but declining overall usage`,
      detail: "TTYB adoption alone is not holding overall engagement up.",
      tone: "danger",
    });
  if (decliningTtyb > 0)
    signals.push({
      label: `${decliningTtyb} Tenants show declining TTYB usage over 30 days`,
      detail: "TTYB users fell compared with the start of the period.",
      tone: "warning",
    });

  return {
    users,
    activeUsers: sum((t) => t.ttyb.activeUsers),
    interactions: sum((t) => t.ttyb.interactions),
    adoption: activated ? users / activated : 0,
    extendedReachUsers: sum((t) => t.ttyb.extendedReachUsers),
    directUsers: sum((t) => t.ttyb.directUsers),
    bothUsers: sum((t) => t.ttyb.bothUsers),
    directOnlyUsers: sum((t) => t.ttyb.directOnlyUsers),
    growthPct,
    trend,
    signals,
    tenantsWithTtyb: records.filter((t) => t.ttyb.users > 0).length,
  };
}

function suggestionFor(type?: string) {
  switch (type) {
    case "App Adoption Gap":
      return "Review app enablement with the Tenant";
    case "Usage Decline":
      return "Run a usage review with the sponsor";
    case "Activation Gap":
      return "Review onboarding of unactivated employees";
    case "Engagement Gap":
      return "Review dormant activated users";
    case "TTYB Adoption":
      return "Review TTYB awareness at this Tenant";
    case "Cross-App Adoption":
      return "Compare app usage patterns with the Tenant";
    default:
      return "Review account with Customer Success";
  }
}

export const provider: TenantSuccessProvider = {
  async getOverview() {
    return delay(buildOverview(dataset()));
  },
  async listTenants(filters) {
    return delay(applyFilters(dataset(), filters));
  },
  async getTenant(id) {
    const found = dataset().find((t) => t.id === id);
    if (!found) throw new Error(`Tenant "${id}" not found`);
    return delay(found);
  },
  async listOpportunities(filters) {
    return delay(applyOpportunityFilters(allOpportunities(dataset()), filters));
  },
  async getOpportunity(id) {
    const found = allOpportunities(dataset()).find((o) => o.id === id);
    if (!found) throw new Error(`Opportunity "${id}" not found`);
    return delay(found);
  },
  async setOpportunityStatus(id, status) {
    statusOverrides.set(id, status);
    const found = allOpportunities(dataset()).find((o) => o.id === id);
    if (!found) throw new Error(`Opportunity "${id}" not found`);
    return delay(found);
  },
  async getAdoptionIntelligence() {
    return delay(buildAdoptionIntelligence(dataset()));
  },
  async getAppAdoption(appId) {
    const detail = buildAppDetail(dataset(), appId);
    if (!detail.tenantsWithAccess) throw new Error(`App "${appId}" not found`);
    return delay(detail);
  },
};
