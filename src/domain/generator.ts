import { APPS } from "./catalog";
import { clamp, hashString, mulberry32 } from "./random";
import { aggregateApps, aggregateTenant, buildUsers } from "./users";
import { aggregateTtyb, buildTtybHistory, buildTtybUsage } from "./ttyb";
import type { Industry, Tenant, TenantAppUsage, TenantUser, TrendDirection, UsagePoint } from "./types";

interface TenantSeed {
  name: string;
  industry: Industry;
  employees: number;
  /** long-run trajectory of the tenant */
  trajectory: "growing" | "stable" | "declining";
  activation: number; // 0..1
  engagement: number; // WAU / activated
  adoptionBias: number; // shifts app adoption up/down
  /** share of activated users who have used TTYB in the last 30 days */
  ttybPropensity: number;
  /** independent TTYB trajectory — TTYB adoption need not follow app usage */
  ttybTrajectory: "growing" | "stable" | "declining" | "nascent";
}

const SEEDS: TenantSeed[] = [
  { name: "ABC Finance", industry: "Finance", employees: 240, trajectory: "growing", activation: 0.86, engagement: 0.74, adoptionBias: 0.08, ttybPropensity: 0.34, ttybTrajectory: "growing" },
  { name: "Northgate Capital", industry: "NBFC", employees: 410, trajectory: "stable", activation: 0.79, engagement: 0.66, adoptionBias: 0.02, ttybPropensity: 0.19, ttybTrajectory: "stable" },
  { name: "Sunrise Lending", industry: "NBFC", employees: 168, trajectory: "declining", activation: 0.61, engagement: 0.48, adoptionBias: -0.12, ttybPropensity: 0.07, ttybTrajectory: "declining" },
  { name: "Vertex DSA Network", industry: "DSA", employees: 96, trajectory: "growing", activation: 0.9, engagement: 0.8, adoptionBias: 0.12, ttybPropensity: 0.46, ttybTrajectory: "growing" },
  { name: "Pinnacle Associates", industry: "DSA", employees: 54, trajectory: "declining", activation: 0.52, engagement: 0.41, adoptionBias: -0.18, ttybPropensity: 0.04, ttybTrajectory: "nascent" },
  { name: "Meridian Hospitality", industry: "Hospitality", employees: 320, trajectory: "stable", activation: 0.68, engagement: 0.58, adoptionBias: -0.04, ttybPropensity: 0.12, ttybTrajectory: "stable" },
  { name: "Lakeview Resorts", industry: "Hospitality", employees: 145, trajectory: "growing", activation: 0.74, engagement: 0.63, adoptionBias: 0.03, ttybPropensity: 0.28, ttybTrajectory: "growing" },
  { name: "Orbit Distribution", industry: "Distribution", employees: 512, trajectory: "stable", activation: 0.82, engagement: 0.69, adoptionBias: 0.05, ttybPropensity: 0.22, ttybTrajectory: "stable" },
  { name: "Kavery Traders", industry: "Distribution", employees: 88, trajectory: "declining", activation: 0.57, engagement: 0.44, adoptionBias: -0.14, ttybPropensity: 0.05, ttybTrajectory: "declining" },
  { name: "Helix Manufacturing", industry: "Manufacturing", employees: 640, trajectory: "growing", activation: 0.71, engagement: 0.6, adoptionBias: -0.02, ttybPropensity: 0.16, ttybTrajectory: "growing" },
  { name: "Ironworks Precision", industry: "Manufacturing", employees: 275, trajectory: "stable", activation: 0.66, engagement: 0.55, adoptionBias: -0.06, ttybPropensity: 0.09, ttybTrajectory: "stable" },
  { name: "Blueline Services", industry: "Services", employees: 132, trajectory: "growing", activation: 0.88, engagement: 0.77, adoptionBias: 0.1, ttybPropensity: 0.41, ttybTrajectory: "growing" },
  { name: "Corvus Advisory", industry: "Services", employees: 62, trajectory: "stable", activation: 0.75, engagement: 0.64, adoptionBias: 0.01, ttybPropensity: 0.24, ttybTrajectory: "stable" },
  { name: "Silverstone Finserv", industry: "Finance", employees: 198, trajectory: "declining", activation: 0.64, engagement: 0.46, adoptionBias: -0.1, ttybPropensity: 0.06, ttybTrajectory: "declining" },
  { name: "Trinity Credit Union", industry: "Finance", employees: 355, trajectory: "stable", activation: 0.8, engagement: 0.68, adoptionBias: 0.04, ttybPropensity: 0.18, ttybTrajectory: "stable" },
  { name: "Aster NBFC Partners", industry: "NBFC", employees: 122, trajectory: "growing", activation: 0.83, engagement: 0.72, adoptionBias: 0.07, ttybPropensity: 0.31, ttybTrajectory: "growing" },
  { name: "Greenfield Logistics", industry: "Distribution", employees: 230, trajectory: "declining", activation: 0.6, engagement: 0.43, adoptionBias: -0.16, ttybPropensity: 0.03, ttybTrajectory: "nascent" },
  { name: "Cobalt Industries", industry: "Manufacturing", employees: 480, trajectory: "stable", activation: 0.7, engagement: 0.57, adoptionBias: -0.03, ttybPropensity: 0.13, ttybTrajectory: "stable" },
];

const TRAJECTORY_TREND: Record<TenantSeed["trajectory"], number> = {
  growing: 0.14,
  stable: 0.01,
  declining: -0.17,
};

const TTYB_TREND: Record<TenantSeed["ttybTrajectory"], number> = {
  growing: 0.34,
  stable: 0.03,
  declining: -0.24,
  nascent: 0.6,
};

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const HISTORY_DAYS = 30;

/** ISO yyyy-mm-dd for "today" in UTC — default as-of date for the simulation. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayISO(asOfDate: string, offsetFromEnd: number) {
  const d = new Date(`${asOfDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - offsetFromEnd);
  return d.toISOString().slice(0, 10);
}

function toAppUsage(
  seed: TenantSeed,
  rnd: () => number,
  users: TenantUser[],
): TenantAppUsage[] {
  const aggregates = aggregateApps(users);
  return APPS.map((app) => {
    const agg = aggregates.find((a) => a.appId === app.id)!;
    const trendPct = clamp(
      TRAJECTORY_TREND[seed.trajectory] + (rnd() - 0.5) * 0.22 + (app.category === "Sales" ? -0.04 : 0),
      -0.45,
      0.5,
    );

    return {
      appId: app.id,
      appName: app.name,
      category: app.category,
      eligibleUsers: agg.eligibleUsers,
      usage: { direct: { activatedUsers: agg.activatedUsers, activeUsers: agg.activeUsers } },
      adoption: agg.adoption,
      trendPct: Math.round(trendPct * 100) / 100,
      trend: toDirection(trendPct),
    };
  });
}

export function toDirection(trendPct: number): TrendDirection {
  if (trendPct > 0.03) return "up";
  if (trendPct < -0.03) return "down";
  return "flat";
}

function historyDays(asOfDate: string): string[] {
  return Array.from({ length: HISTORY_DAYS }, (_, i) => dayISO(asOfDate, HISTORY_DAYS - 1 - i));
}

function buildHistory(
  asOfDate: string,
  rnd: () => number,
  endActive: number,
  endAdoption: number,
  trendPct: number,
): UsagePoint[] {
  const startActive = endActive / (1 + trendPct);
  const startAdoption = endAdoption / (1 + trendPct * 0.6);
  const points: UsagePoint[] = [];
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const t = i / (HISTORY_DAYS - 1);
    // ease-in-out so the story is a curve, not a straight line
    const eased = t * t * (3 - 2 * t);
    const noise = (rnd() - 0.5) * 0.05;
    const date = dayISO(asOfDate, HISTORY_DAYS - 1 - i);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const weekendDip = weekday === 0 ? -0.2 : weekday === 6 ? -0.12 : 0;
    const active = (startActive + (endActive - startActive) * eased) * (1 + noise + weekendDip);
    const adoption = (startAdoption + (endAdoption - startAdoption) * eased) * (1 + noise * 0.4);
    points.push({
      date,
      activeUsers: Math.max(1, Math.round(active)),
      adoption: clamp(adoption, 0.02, 0.99),
    });
  }
  return points;
}

export interface SimulationOptions {
  /** ISO yyyy-mm-dd the dataset is generated relative to. Defaults to today (UTC). */
  asOfDate?: string;
}

/**
 * Builds the Tenant read model. Deterministic for a given seed + asOfDate.
 * Tenant/App metrics are derived from the underlying simulated user population.
 */
export function buildTenants(options: SimulationOptions = {}): Tenant[] {
  const asOfDate = options.asOfDate ?? todayISO();

  return SEEDS.map((seed) => {
    const id = slug(seed.name);
    const rnd = mulberry32(hashString(`${seed.name}|${asOfDate}`));

    const users = buildUsers({
      tenantId: id,
      industry: seed.industry,
      employees: seed.employees,
      activation: seed.activation,
      engagement: seed.engagement,
      adoptionBias: seed.adoptionBias,
      ttybPropensity: seed.ttybPropensity,
      asOfDate,
    });

    const apps = toAppUsage(seed, rnd, users);
    const totals = aggregateTenant(users, aggregateApps(users));

    const trendPct =
      Math.round((TRAJECTORY_TREND[seed.trajectory] + (rnd() - 0.5) * 0.06) * 100) / 100;

    const history = buildHistory(asOfDate, rnd, totals.monthlyActiveUsers, totals.appAdoption, trendPct);

    const ttybAgg = aggregateTtyb(users);
    const ttybTrendPct =
      Math.round((TTYB_TREND[seed.ttybTrajectory] + (rnd() - 0.5) * 0.12) * 100) / 100;
    const ttyb = buildTtybUsage(
      ttybAgg,
      ttybTrendPct,
      buildTtybHistory(historyDays(asOfDate), rnd, ttybAgg.users, ttybAgg.interactions, ttybTrendPct),
    );

    const lastActivityOffset =
      seed.trajectory === "declining" ? Math.floor(rnd() * 9) + 2 : Math.floor(rnd() * 2);

    return {
      id,
      name: seed.name,
      industry: seed.industry,
      employees: totals.employees,
      activatedUsers: totals.activatedUsers,
      weeklyActiveUsers: totals.weeklyActiveUsers,
      monthlyActiveUsers: totals.monthlyActiveUsers,
      inactiveUsers: totals.inactiveUsers,
      appAdoption: totals.appAdoption,
      trendPct,
      trend: toDirection(trendPct),
      lastActivity: dayISO(asOfDate, lastActivityOffset),
      apps,
      history,
      ttyb,
    } satisfies Tenant;
  });
}
