import { describe, expect, it } from "vitest";
import { aggregateApps, aggregateTenant, buildUsers } from "../users";
import { buildTenants } from "../generator";
import type { TenantUser } from "../types";

function user(over: Partial<TenantUser> = {}): TenantUser {
  return {
    id: "u1",
    tenantId: "t",
    activated: true,
    weeklyActive: true,
    monthlyActive: true,
    apps: [{ appId: "tasks", eligible: true, activated: true, active: true }],
    ttyb: { used: false, interactions: 0, lastUsedDaysAgo: null, recentlyActive: false },
    ...over,
  };
}

describe("user-level aggregation", () => {
  it("computes adoption as active / eligible", () => {
    const users = [
      user({ id: "a" }),
      user({ id: "b", apps: [{ appId: "tasks", eligible: true, activated: true, active: false }] }),
      user({ id: "c", apps: [{ appId: "tasks", eligible: false, activated: false, active: false }] }),
    ];
    const tasks = aggregateApps(users).find((a) => a.appId === "tasks")!;
    expect(tasks.eligibleUsers).toBe(2);
    expect(tasks.activatedUsers).toBe(2);
    expect(tasks.activeUsers).toBe(1);
    expect(tasks.adoption).toBeCloseTo(0.5);
  });

  it("keeps activated and active distinct", () => {
    const users = [
      user({ apps: [{ appId: "tasks", eligible: true, activated: true, active: false }] }),
    ];
    const tasks = aggregateApps(users).find((a) => a.appId === "tasks")!;
    expect(tasks.activatedUsers).toBe(1);
    expect(tasks.activeUsers).toBe(0);
  });

  it("returns 0 adoption when no users are eligible", () => {
    const users = [
      user({ apps: [{ appId: "tasks", eligible: false, activated: false, active: false }] }),
    ];
    const tasks = aggregateApps(users).find((a) => a.appId === "tasks")!;
    expect(tasks.eligibleUsers).toBe(0);
    expect(tasks.adoption).toBe(0);
  });

  it("derives tenant activation / engagement counts from users", () => {
    const users = [
      user({ id: "a" }),
      user({ id: "b", weeklyActive: false, monthlyActive: true }),
      user({ id: "c", weeklyActive: false, monthlyActive: false }),
      user({ id: "d", activated: false, weeklyActive: false, monthlyActive: false }),
    ];
    const totals = aggregateTenant(users, aggregateApps(users));
    expect(totals.employees).toBe(4);
    expect(totals.activatedUsers).toBe(3);
    expect(totals.weeklyActiveUsers).toBe(1);
    expect(totals.monthlyActiveUsers).toBe(2);
    expect(totals.inactiveUsers).toBe(1);
  });
});

describe("simulation determinism and as-of date", () => {
  it("is deterministic for a given seed + as-of date", () => {
    const a = buildTenants({ asOfDate: "2026-05-01" });
    const b = buildTenants({ asOfDate: "2026-05-01" });
    expect(a).toEqual(b);
  });

  it("anchors history to the configured as-of date", () => {
    const [tenant] = buildTenants({ asOfDate: "2026-05-01" });
    expect(tenant!.history.at(-1)!.date).toBe("2026-05-01");
    expect(tenant!.history).toHaveLength(30);
    expect(tenant!.history[0]!.date).toBe("2026-04-02");
  });

  it("keeps eligible >= activated >= active per app", () => {
    for (const tenant of buildTenants({ asOfDate: "2026-05-01" })) {
      for (const app of tenant.apps) {
        expect(app.usage.direct.activatedUsers).toBeLessThanOrEqual(app.eligibleUsers);
        expect(app.usage.direct.activeUsers).toBeLessThanOrEqual(app.usage.direct.activatedUsers);
      }
      expect(tenant.weeklyActiveUsers).toBeLessThanOrEqual(tenant.monthlyActiveUsers);
      expect(tenant.monthlyActiveUsers).toBeLessThanOrEqual(tenant.activatedUsers);
      expect(tenant.activatedUsers).toBeLessThanOrEqual(tenant.employees);
    }
  });

  it("generates one simulated user per employee", () => {
    const users = buildUsers({
      tenantId: "acme",
      industry: "Finance",
      employees: 50,
      activation: 0.8,
      engagement: 0.6,
      adoptionBias: 0,
      ttybPropensity: 0.2,
      asOfDate: "2026-05-01",
    });
    expect(users).toHaveLength(50);
    expect(users.every((u) => u.apps.length > 0)).toBe(true);
  });
});
