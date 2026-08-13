import { describe, expect, it } from "vitest";
import { buildTenants } from "../generator";
import { detectOpportunities } from "../opportunities";
import { aggregateTtyb, extendedReachBucket, ttybAdoptionBucket, ttybDirection } from "../ttyb";
import type { TenantUser } from "../types";
import { makeTenant, makeTtyb } from "./fixtures";

const AS_OF = "2026-06-15";

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

describe("TTYB access-path aggregation", () => {
  it("splits users into direct-only, both and TTYB-only", () => {
    const users = [
      user({ id: "direct-only" }),
      user({
        id: "both",
        ttyb: { used: true, interactions: 12, lastUsedDaysAgo: 2, recentlyActive: true },
      }),
      user({
        id: "ttyb-only",
        monthlyActive: false,
        weeklyActive: false,
        apps: [{ appId: "tasks", eligible: true, activated: true, active: false }],
        ttyb: { used: true, interactions: 5, lastUsedDaysAgo: 20, recentlyActive: false },
      }),
    ];

    const agg = aggregateTtyb(users);
    expect(agg.directUsers).toBe(2);
    expect(agg.users).toBe(2);
    expect(agg.directOnlyUsers).toBe(1);
    expect(agg.bothUsers).toBe(1);
    expect(agg.extendedReachUsers).toBe(1);
    expect(agg.activeUsers).toBe(1);
    expect(agg.interactions).toBe(17);
    expect(agg.adoption).toBeCloseTo(2 / 3);
  });

  it("never lets unactivated users reach TTYB", () => {
    const tenants = buildTenants({ asOfDate: AS_OF });
    for (const t of tenants) {
      expect(t.ttyb.users).toBeLessThanOrEqual(t.activatedUsers);
    }
  });

  it("keeps Both <= Direct, Both <= TTYB and Extended Reach = TTYB - Both", () => {
    for (const t of buildTenants({ asOfDate: AS_OF })) {
      const { bothUsers, directUsers, users, extendedReachUsers, directOnlyUsers } = t.ttyb;
      expect(bothUsers).toBeLessThanOrEqual(directUsers);
      expect(bothUsers).toBeLessThanOrEqual(users);
      expect(extendedReachUsers).toBe(users - bothUsers);
      expect(directOnlyUsers).toBe(directUsers - bothUsers);
    }
  });

  it("is deterministic for a given as-of date and changes with it", () => {
    const a = buildTenants({ asOfDate: AS_OF })[0]!.ttyb;
    const b = buildTenants({ asOfDate: AS_OF })[0]!.ttyb;
    expect(a).toEqual(b);

    const other = buildTenants({ asOfDate: "2026-07-20" })[0]!.ttyb;
    expect(other.history[other.history.length - 1]!.date).toBe("2026-07-20");
    expect(a.history[a.history.length - 1]!.date).toBe(AS_OF);
  });

  it("builds a 30-day history with non-negative values", () => {
    for (const t of buildTenants({ asOfDate: AS_OF })) {
      expect(t.ttyb.history).toHaveLength(30);
      expect(t.ttyb.history.every((p) => p.users >= 0 && p.interactions >= 0)).toBe(true);
    }
  });

  it("classifies buckets and trend direction", () => {
    expect(ttybAdoptionBucket(0)).toBe("none");
    expect(ttybAdoptionBucket(0.1)).toBe("low");
    expect(ttybAdoptionBucket(0.2)).toBe("medium");
    expect(ttybAdoptionBucket(0.4)).toBe("high");
    expect(extendedReachBucket(0, 100)).toBe("none");
    expect(extendedReachBucket(3, 100)).toBe("some");
    expect(extendedReachBucket(12, 100)).toBe("high");
    expect(ttybDirection(0.2)).toBe("up");
    expect(ttybDirection(0)).toBe("flat");
    expect(ttybDirection(-0.2)).toBe("down");
  });
});

describe("TTYB adoption opportunity rule", () => {
  it("flags Tenants with healthy app adoption but little TTYB usage", () => {
    const tenant = makeTenant({
      appAdoption: 0.72,
      activatedUsers: 120,
      ttyb: makeTtyb({ users: 4, adoption: 0.03 }),
    });
    const opp = detectOpportunities(tenant).find((o) => o.type === "TTYB Adoption Opportunity");
    expect(opp).toBeDefined();
    expect(opp!.priority).toBe("High");
    expect(opp!.potentialUsers).toBeGreaterThan(0);
  });

  it("does not flag Tenants that already use TTYB broadly", () => {
    const tenant = makeTenant({
      appAdoption: 0.72,
      activatedUsers: 120,
      ttyb: makeTtyb({ users: 60, adoption: 0.5 }),
    });
    expect(
      detectOpportunities(tenant).some((o) => o.type === "TTYB Adoption Opportunity"),
    ).toBe(false);
  });

  it("does not flag Tenants whose direct app adoption is still weak", () => {
    const tenant = makeTenant({
      appAdoption: 0.2,
      activatedUsers: 120,
      ttyb: makeTtyb({ users: 2, adoption: 0.02 }),
    });
    expect(
      detectOpportunities(tenant).some((o) => o.type === "TTYB Adoption Opportunity"),
    ).toBe(false);
  });
});
