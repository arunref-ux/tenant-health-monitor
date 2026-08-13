import { APPS, eligibilityShare } from "./catalog";
import { clamp, hashString, mulberry32 } from "./random";
import type { Industry, Tenant, TenantAppUsage, TrendDirection, UsagePoint } from "./types";

interface TenantSeed {
  name: string;
  industry: Industry;
  employees: number;
  /** long-run trajectory of the tenant */
  trajectory: "growing" | "stable" | "declining";
  activation: number; // 0..1
  engagement: number; // WAU / activated
  adoptionBias: number; // shifts app adoption up/down
}

const SEEDS: TenantSeed[] = [
  { name: "ABC Finance", industry: "Finance", employees: 240, trajectory: "growing", activation: 0.86, engagement: 0.74, adoptionBias: 0.08 },
  { name: "Northgate Capital", industry: "NBFC", employees: 410, trajectory: "stable", activation: 0.79, engagement: 0.66, adoptionBias: 0.02 },
  { name: "Sunrise Lending", industry: "NBFC", employees: 168, trajectory: "declining", activation: 0.61, engagement: 0.48, adoptionBias: -0.12 },
  { name: "Vertex DSA Network", industry: "DSA", employees: 96, trajectory: "growing", activation: 0.9, engagement: 0.8, adoptionBias: 0.12 },
  { name: "Pinnacle Associates", industry: "DSA", employees: 54, trajectory: "declining", activation: 0.52, engagement: 0.41, adoptionBias: -0.18 },
  { name: "Meridian Hospitality", industry: "Hospitality", employees: 320, trajectory: "stable", activation: 0.68, engagement: 0.58, adoptionBias: -0.04 },
  { name: "Lakeview Resorts", industry: "Hospitality", employees: 145, trajectory: "growing", activation: 0.74, engagement: 0.63, adoptionBias: 0.03 },
  { name: "Orbit Distribution", industry: "Distribution", employees: 512, trajectory: "stable", activation: 0.82, engagement: 0.69, adoptionBias: 0.05 },
  { name: "Kavery Traders", industry: "Distribution", employees: 88, trajectory: "declining", activation: 0.57, engagement: 0.44, adoptionBias: -0.14 },
  { name: "Helix Manufacturing", industry: "Manufacturing", employees: 640, trajectory: "growing", activation: 0.71, engagement: 0.6, adoptionBias: -0.02 },
  { name: "Ironworks Precision", industry: "Manufacturing", employees: 275, trajectory: "stable", activation: 0.66, engagement: 0.55, adoptionBias: -0.06 },
  { name: "Blueline Services", industry: "Services", employees: 132, trajectory: "growing", activation: 0.88, engagement: 0.77, adoptionBias: 0.1 },
  { name: "Corvus Advisory", industry: "Services", employees: 62, trajectory: "stable", activation: 0.75, engagement: 0.64, adoptionBias: 0.01 },
  { name: "Silverstone Finserv", industry: "Finance", employees: 198, trajectory: "declining", activation: 0.64, engagement: 0.46, adoptionBias: -0.1 },
  { name: "Trinity Credit Union", industry: "Finance", employees: 355, trajectory: "stable", activation: 0.8, engagement: 0.68, adoptionBias: 0.04 },
  { name: "Aster NBFC Partners", industry: "NBFC", employees: 122, trajectory: "growing", activation: 0.83, engagement: 0.72, adoptionBias: 0.07 },
  { name: "Greenfield Logistics", industry: "Distribution", employees: 230, trajectory: "declining", activation: 0.6, engagement: 0.43, adoptionBias: -0.16 },
  { name: "Cobalt Industries", industry: "Manufacturing", employees: 480, trajectory: "stable", activation: 0.7, engagement: 0.57, adoptionBias: -0.03 },
];

const TRAJECTORY_TREND: Record<TenantSeed["trajectory"], number> = {
  growing: 0.14,
  stable: 0.01,
  declining: -0.17,
};

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const HISTORY_DAYS = 30;
const REFERENCE_DATE = new Date("2026-08-13T00:00:00Z");

function dayISO(offsetFromEnd: number) {
  const d = new Date(REFERENCE_DATE);
  d.setUTCDate(d.getUTCDate() - offsetFromEnd);
  return d.toISOString().slice(0, 10);
}

function buildApps(seed: TenantSeed, rnd: () => number, activated: number, mau: number): TenantAppUsage[] {
  return APPS.map((app) => {
    const eligible = Math.max(3, Math.round(seed.employees * eligibilityShare(app.id, seed.industry)));
    const activationCeiling = Math.min(eligible, activated);
    const base = clamp(0.55 + seed.adoptionBias + (rnd() - 0.5) * 0.4, 0.12, 0.97);
    // Core/HR apps land higher, specialised apps lower.
    const categoryLift =
      app.category === "HR" ? 0.18 : app.category === "Core" ? 0.1 : app.category === "Sales" ? -0.12 : -0.04;
    const adoptionTarget = clamp(base + categoryLift, 0.1, 0.96);

    const appActive = Math.round(Math.min(activationCeiling, eligible * adoptionTarget, mau));
    const appActivated = Math.min(
      activationCeiling,
      Math.round(appActive * clamp(1.15 + rnd() * 0.25, 1.05, 1.6)),
    );
    const adoption = eligible ? appActive / eligible : 0;

    const trendPct = clamp(
      TRAJECTORY_TREND[seed.trajectory] + (rnd() - 0.5) * 0.22 + (app.category === "Sales" ? -0.04 : 0),
      -0.45,
      0.5,
    );

    return {
      appId: app.id,
      appName: app.name,
      category: app.category,
      eligibleUsers: eligible,
      usage: { direct: { activatedUsers: appActivated, activeUsers: appActive } },
      adoption,
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

function buildHistory(
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
    const weekday = new Date(dayISO(HISTORY_DAYS - 1 - i)).getUTCDay();
    const weekendDip = weekday === 0 ? -0.2 : weekday === 6 ? -0.12 : 0;
    const active = (startActive + (endActive - startActive) * eased) * (1 + noise + weekendDip);
    const adoption = (startAdoption + (endAdoption - startAdoption) * eased) * (1 + noise * 0.4);
    points.push({
      date: dayISO(HISTORY_DAYS - 1 - i),
      activeUsers: Math.max(1, Math.round(active)),
      adoption: clamp(adoption, 0.02, 0.99),
    });
  }
  return points;
}

export function buildTenants(): Tenant[] {
  return SEEDS.map((seed) => {
    const rnd = mulberry32(hashString(seed.name));
    const activated = Math.round(seed.employees * seed.activation);
    const wau = Math.round(activated * seed.engagement);
    const mau = Math.min(activated, Math.round(wau * clamp(1.18 + rnd() * 0.15, 1.1, 1.4)));
    const inactive = Math.max(0, activated - mau);

    const apps = buildApps(seed, rnd, activated, mau);
    const totalEligible = apps.reduce((s, a) => s + a.eligibleUsers, 0);
    const appAdoption =
      apps.reduce((s, a) => s + a.usage.direct.activeUsers, 0) / Math.max(1, totalEligible);

    const trendPct =
      Math.round((TRAJECTORY_TREND[seed.trajectory] + (rnd() - 0.5) * 0.06) * 100) / 100;

    const history = buildHistory(rnd, mau, appAdoption, trendPct);

    const lastActivityOffset =
      seed.trajectory === "declining" ? Math.floor(rnd() * 9) + 2 : Math.floor(rnd() * 2);

    return {
      id: slug(seed.name),
      name: seed.name,
      industry: seed.industry,
      employees: seed.employees,
      activatedUsers: activated,
      weeklyActiveUsers: wau,
      monthlyActiveUsers: mau,
      inactiveUsers: inactive,
      appAdoption,
      trendPct,
      trend: toDirection(trendPct),
      lastActivity: dayISO(lastActivityOffset),
      apps,
      history,
    } satisfies Tenant;
  });
}
