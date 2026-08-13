import type { Tenant, TenantAppUsage } from "../types";

export function makeApp(over: Partial<TenantAppUsage> = {}): TenantAppUsage {
  return {
    appId: "tasks",
    appName: "Tasks",
    category: "Core",
    eligibleUsers: 100,
    usage: { direct: { activatedUsers: 70, activeUsers: 60 } },
    adoption: 0.6,
    trendPct: 0.05,
    trend: "up",
    ...over,
  };
}

export function makeTenant(over: Partial<Tenant> = {}): Tenant {
  const base: Tenant = {
    id: "test-tenant",
    name: "Test Tenant",
    industry: "Finance",
    employees: 100,
    activatedUsers: 80,
    weeklyActiveUsers: 60,
    monthlyActiveUsers: 70,
    inactiveUsers: 10,
    appAdoption: 0.6,
    trendPct: 0.05,
    trend: "up",
    lastActivity: "2026-08-13",
    apps: [makeApp()],
    history: [],
  };
  return { ...base, ...over };
}
