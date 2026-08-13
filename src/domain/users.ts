import { APPS, eligibilityShare } from "./catalog";
import { clamp, hashString, mulberry32 } from "./random";
import type { Industry, TenantUser, UserAppState, UserTtybState } from "./types";

/**
 * Minimal user-level simulation.
 *
 *   Tenant -> User -> App { eligible, activated, active }
 *
 * This is the lowest level of the simulated model. Tenant/App aggregates
 * consumed by the UI are derived from these users (see `aggregateApps`).
 * Deliberately no events, capabilities, business skills or access paths here.
 */

export interface UserPopulationInput {
  tenantId: string;
  industry: Industry;
  employees: number;
  /** probability an employee has activated the platform at all, 0..1 */
  activation: number;
  /** probability an activated employee is weekly active, 0..1 */
  engagement: number;
  /** shifts per-app adoption up/down */
  adoptionBias: number;
  /** probability an activated user has used TTYB in the last 30 days, 0..1 */
  ttybPropensity: number;
  asOfDate: string; // ISO yyyy-mm-dd — keeps generation deterministic per as-of date
}

/** Per-app adoption targets for a tenant — deterministic for a given tenant seed. */
export function appAdoptionTargets(input: UserPopulationInput): Record<string, number> {
  const rnd = mulberry32(hashString(`${input.tenantId}|apps`));
  const targets: Record<string, number> = {};
  for (const app of APPS) {
    const base = clamp(0.55 + input.adoptionBias + (rnd() - 0.5) * 0.4, 0.12, 0.97);
    const lift =
      app.category === "HR" ? 0.18 : app.category === "Core" ? 0.1 : app.category === "Sales" ? -0.12 : -0.04;
    targets[app.id] = clamp(base + lift, 0.1, 0.96);
  }
  return targets;
}

export function buildUsers(input: UserPopulationInput): TenantUser[] {
  const rnd = mulberry32(hashString(`${input.tenantId}|${input.asOfDate}|users`));
  const targets = appAdoptionTargets(input);

  return Array.from({ length: input.employees }, (_, i) => {
    const activated = rnd() < input.activation;
    const weeklyActive = activated && rnd() < input.engagement;
    const monthlyActive = activated && (weeklyActive || rnd() < 0.35);

    const ttyb = simulateTtyb(rnd, activated, input.ttybPropensity);

    const apps: UserAppState[] = APPS.map((app) => {
      const eligible = rnd() < eligibilityShare(app.id, input.industry);
      // Eligible users can only activate an app if they activated the platform.
      const target = targets[app.id] ?? 0.5;
      const appActivated = eligible && activated && rnd() < clamp(target * 1.25, 0.05, 0.99);
      const appActive = appActivated && monthlyActive && rnd() < clamp(target + 0.2, 0.1, 0.98);
      return { appId: app.id, eligible, activated: appActivated, active: appActive };
    });

    return {
      id: `${input.tenantId}-u${i + 1}`,
      tenantId: input.tenantId,
      activated,
      weeklyActive,
      monthlyActive,
      apps,
      ttyb,
    } satisfies TenantUser;
  });
}

/**
 * TTYB usage for one user. Deliberately minimal: did they use it, how often,
 * and how recently. No intents, conversations or capabilities in this iteration.
 */
function simulateTtyb(rnd: () => number, activated: boolean, propensity: number): UserTtybState {
  // Only users who activated Aurumi can reach TTYB.
  const used = activated && rnd() < clamp(propensity, 0, 1);
  if (!used) return { used: false, interactions: 0, lastUsedDaysAgo: null, recentlyActive: false };
  const lastUsedDaysAgo = Math.floor(rnd() ** 1.7 * 30);
  // heavier users tend to be the more recent ones
  const intensity = rnd() ** 1.8;
  const interactions = Math.max(1, Math.round(intensity * 46 + (lastUsedDaysAgo <= 7 ? 3 : 0)));
  return { used: true, interactions, lastUsedDaysAgo, recentlyActive: lastUsedDaysAgo <= 7 };
}

export interface AppAggregate {
  appId: string;
  eligibleUsers: number;
  activatedUsers: number;
  activeUsers: number;
  /** activeUsers / eligibleUsers, 0..1 (0 when nobody is eligible) */
  adoption: number;
}

export function aggregateApps(users: TenantUser[]): AppAggregate[] {
  return APPS.map((app) => {
    let eligible = 0;
    let activated = 0;
    let active = 0;
    for (const user of users) {
      const state = user.apps.find((a) => a.appId === app.id);
      if (!state?.eligible) continue;
      eligible++;
      if (state.activated) activated++;
      if (state.active) active++;
    }
    return {
      appId: app.id,
      eligibleUsers: eligible,
      activatedUsers: activated,
      activeUsers: active,
      adoption: eligible ? active / eligible : 0,
    };
  });
}

export interface TenantAggregate {
  employees: number;
  activatedUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  inactiveUsers: number;
  appAdoption: number;
}

export function aggregateTenant(users: TenantUser[], apps: AppAggregate[]): TenantAggregate {
  const activatedUsers = users.filter((u) => u.activated).length;
  const weeklyActiveUsers = users.filter((u) => u.weeklyActive).length;
  const monthlyActiveUsers = users.filter((u) => u.monthlyActive).length;
  const totalEligible = apps.reduce((s, a) => s + a.eligibleUsers, 0);
  const totalActive = apps.reduce((s, a) => s + a.activeUsers, 0);
  return {
    employees: users.length,
    activatedUsers,
    weeklyActiveUsers,
    monthlyActiveUsers,
    inactiveUsers: Math.max(0, activatedUsers - monthlyActiveUsers),
    appAdoption: totalEligible ? totalActive / totalEligible : 0,
  };
}
