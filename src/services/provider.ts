import { buildTenants } from "@/domain/generator";
import { calculateHealth } from "@/domain/health";
import { detectOpportunities } from "@/domain/opportunities";
import type {
  HealthCategory,
  Opportunity,
  OverviewSummary,
  PortfolioFilters,
  TenantRecord,
  UsagePoint,
} from "@/domain/types";

/**
 * Simulated backend. The UI only ever talks to this async interface, so it can
 * later be swapped for real Aurumi APIs without touching components.
 */
export interface TenantSuccessProvider {
  getOverview(): Promise<OverviewSummary>;
  listTenants(filters?: PortfolioFilters): Promise<TenantRecord[]>;
  getTenant(id: string): Promise<TenantRecord>;
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

let cache: TenantRecord[] | null = null;

function dataset(): TenantRecord[] {
  if (!cache) {
    cache = buildTenants().map((tenant) => ({
      ...tenant,
      health: calculateHealth(tenant),
      opportunities: detectOpportunities(tenant),
    }));
  }
  return cache;
}

function adoptionBucket(v: number) {
  if (v >= 0.7) return "high";
  if (v >= 0.45) return "medium";
  return "low";
}

function applyFilters(records: TenantRecord[], f: PortfolioFilters = {}): TenantRecord[] {
  const search = (f.search ?? "").trim().toLowerCase();
  let rows = records.filter((t) => {
    if (search && !`${t.name} ${t.industry}`.toLowerCase().includes(search)) return false;
    if (f.health && f.health !== "all" && t.health.category !== f.health) return false;
    if (f.industry && f.industry !== "all" && t.industry !== f.industry) return false;
    if (f.adoption && f.adoption !== "all" && adoptionBucket(t.appAdoption) !== f.adoption)
      return false;
    if (f.trend && f.trend !== "all" && t.trend !== f.trend) return false;
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
          return t.opportunities.length;
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

function buildOverview(records: TenantRecord[]): OverviewSummary {
  const count = (c: HealthCategory) => records.filter((t) => t.health.category === c).length;
  const totalEmployees = records.reduce((s, t) => s + t.employees, 0);
  const activeUsers = records.reduce((s, t) => s + t.monthlyActiveUsers, 0);
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
      const top = t.opportunities[0];
      return {
        tenantId: t.id,
        tenantName: t.name,
        category: t.health.category,
        score: t.health.score,
        trendPct: t.trendPct,
        reason: top ? top.title : t.health.negatives[0]?.label ?? "Health below threshold",
        suggestion: suggestionFor(top?.type),
      };
    });

  const allOpportunities: Opportunity[] = records.flatMap((t) => t.opportunities);
  const rank = { High: 0, Medium: 1, Low: 2 } as const;
  const topOpportunities = [...allOpportunities]
    .sort((a, b) => rank[a.priority] - rank[b.priority] || b.potentialUsers - a.potentialUsers)
    .slice(0, 5);

  return {
    totalTenants: records.length,
    healthyTenants: count("Healthy"),
    watchTenants: count("Watch"),
    atRiskTenants: count("At Risk"),
    totalEmployees,
    activeUsers,
    averageAdoption: totalAppActive / Math.max(1, totalEligible),
    openOpportunities: allOpportunities.length,
    trend,
    attention,
    topOpportunities,
  };
}

function suggestionFor(type?: string) {
  switch (type) {
    case "Adoption Gap":
      return "Schedule an enablement session with the app owner";
    case "Usage Decline":
      return "Run a usage review call with the sponsor";
    case "Activation Opportunity":
      return "Launch an onboarding push for unactivated employees";
    case "Feature Adoption":
      return "Send a re-engagement nudge to dormant users";
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
};
