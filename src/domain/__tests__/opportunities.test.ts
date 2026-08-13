import { describe, expect, it } from "vitest";
import { detectOpportunities } from "../opportunities";
import { makeApp, makeTenant } from "./fixtures";

describe("opportunity rules", () => {
  it("flags an activation opportunity for eligible but unactivated employees", () => {
    const tenant = makeTenant({
      employees: 200,
      activatedUsers: 100,
      weeklyActiveUsers: 90,
      monthlyActiveUsers: 95,
      inactiveUsers: 5,
    });
    const opp = detectOpportunities(tenant).find((o) => o.type === "Activation Opportunity");
    expect(opp).toBeDefined();
    expect(opp!.potentialUsers).toBe(100);
    expect(opp!.priority).toBe("High");
  });

  it("flags an engagement opportunity for activated but inactive users", () => {
    const tenant = makeTenant({ inactiveUsers: 40, activatedUsers: 100 });
    const opp = detectOpportunities(tenant).find((o) => o.type === "Engagement Opportunity");
    expect(opp).toBeDefined();
    expect(opp!.potentialUsers).toBe(40);
    expect(opp!.priority).toBe("Medium");
  });

  it("does not report legacy Feature Adoption terminology", () => {
    const types = detectOpportunities(makeTenant({ inactiveUsers: 40 })).map((o) => o.type);
    expect(types).not.toContain("Feature Adoption" as never);
  });

  it("flags usage decline over 30 days", () => {
    const tenant = makeTenant({ trendPct: -0.2, monthlyActiveUsers: 100 });
    const opp = detectOpportunities(tenant).find((o) => o.type === "Usage Decline");
    expect(opp).toBeDefined();
    expect(opp!.priority).toBe("High");
    expect(opp!.potentialUsers).toBe(20);
  });

  it("flags an adoption gap for underused apps", () => {
    const tenant = makeTenant({
      apps: [makeApp({ eligibleUsers: 100, adoption: 0.2, usage: { direct: { activatedUsers: 40, activeUsers: 20 } } })],
    });
    const opp = detectOpportunities(tenant).find((o) => o.type === "Adoption Gap");
    expect(opp).toBeDefined();
    expect(opp!.potentialUsers).toBe(80);
  });

  it("returns nothing for a healthy tenant", () => {
    const tenant = makeTenant({
      employees: 100,
      activatedUsers: 95,
      weeklyActiveUsers: 90,
      monthlyActiveUsers: 92,
      inactiveUsers: 3,
      trendPct: 0.1,
      apps: [makeApp({ eligibleUsers: 90, adoption: 0.85 })],
    });
    expect(detectOpportunities(tenant)).toHaveLength(0);
  });

  it("sorts by priority then potential users", () => {
    const tenant = makeTenant({
      employees: 300,
      activatedUsers: 120,
      weeklyActiveUsers: 60,
      monthlyActiveUsers: 70,
      inactiveUsers: 50,
      trendPct: -0.2,
    });
    const priorities = detectOpportunities(tenant).map((o) => o.priority);
    const rank = { High: 0, Medium: 1, Low: 2 } as const;
    expect(priorities.map((p) => rank[p])).toEqual([...priorities.map((p) => rank[p])].sort());
  });
});
