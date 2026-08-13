import { APPS, eligibilityShare } from "./catalog";
import { clamp, hashString, mulberry32 } from "./random";
import type { Industry, TenantUser, UserAppState } from "./types";

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

    const apps: UserAppState[] = APPS.map((app) => {
      const eligible = rnd() < eligibilityShare(app.id, input.industry);
      // Eligible users can only activate an app if they activated the platform.
      const appActivated = eligible && activated && rnd() < clamp(targets[app.id] * 1.25, 0.05, 0.99);
      const appActive = appActivated && monthlyActive && rnd() < clamp(targets[app.id] + 0.2, 0.1, 0.98);
      return { appId: app.id, eligible, activated: appActivated, active: appActive };
    });

    return {
      id: `${input.tenantId}-u${i + 1}`,
      tenantId: input.tenantId,
      activated,
      weeklyActive,
      monthlyActive,
      apps,
    } satisfies TenantUser;
  });
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
