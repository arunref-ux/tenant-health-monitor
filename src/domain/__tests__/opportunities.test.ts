import { describe, expect, it } from "vitest";
import { detectOpportunities } from "../opportunities";
import { priorityScore, severityFor } from "../prioritize";
import { makeApp, makeTenant } from "./fixtures";

describe("opportunity detection", () => {
  it("flags an activation gap for eligible but unactivated employees", () => {
    const tenant = makeTenant({
      employees: 200,
      activatedUsers: 100,
      weeklyActiveUsers: 90,
      monthlyActiveUsers: 95,
      inactiveUsers: 5,
    });
    const opp = detectOpportunities(tenant).find((o) => o.type === "Activation Gap");
    expect(opp).toBeDefined();
    expect(opp!.affectedUsers).toBe(100);
    expect(opp!.status).toBe("Open");
    expect(opp!.lens).toBe("Tenant");
    expect(opp!.description).toContain("100 of 200");
    expect(opp!.evidence.map((e) => e.label)).toContain("Activation rate");
  });

  it("flags an engagement gap for activated but inactive users", () => {
    const tenant = makeTenant({ inactiveUsers: 40, activatedUsers: 100 });
    const opp = detectOpportunities(tenant).find((o) => o.type === "Engagement Gap");
    expect(opp).toBeDefined();
    expect(opp!.affectedUsers).toBe(40);
    expect(opp!.whyItMatters).toContain("40 of 100");
  });

  it("does not report legacy opportunity terminology", () => {
    const types = detectOpportunities(makeTenant({ inactiveUsers: 40 })).map((o) => o.type);
    expect(types).not.toContain("Feature Adoption" as never);
    expect(types).not.toContain("Engagement Opportunity" as never);
  });

  it("flags usage decline over 30 days", () => {
    const tenant = makeTenant({ trendPct: -0.2, monthlyActiveUsers: 100 });
    const opp = detectOpportunities(tenant).find((o) => o.type === "Usage Decline");
    expect(opp).toBeDefined();
    expect(opp!.affectedUsers).toBe(20);
    expect(opp!.trend).toBe("down");
  });

  it("flags an app adoption gap with app-level evidence", () => {
    const tenant = makeTenant({
      apps: [
        makeApp({
          eligibleUsers: 74,
          adoption: 0.28,
          usage: { direct: { activatedUsers: 40, activeUsers: 21 } },
        }),
      ],
    });
    const opp = detectOpportunities(tenant).find((o) => o.type === "App Adoption Gap");
    expect(opp).toBeDefined();
    expect(opp!.lens).toBe("Aurumi");
    expect(opp!.affectedUsers).toBe(53);
    expect(opp!.description).toContain("28% adoption among 74 eligible users");
    expect(opp!.appIds).toEqual(["tasks"]);
  });

  it("ignores apps with a small eligible population", () => {
    const tenant = makeTenant({
      apps: [makeApp({ eligibleUsers: 8, adoption: 0.1, usage: { direct: { activatedUsers: 3, activeUsers: 1 } } })],
    });
    expect(detectOpportunities(tenant).some((o) => o.type === "App Adoption Gap")).toBe(false);
  });

  it("flags a cross-app adoption contrast without claiming causality", () => {
    const tenant = makeTenant({
      apps: [
        makeApp({
          appId: "business-contacts",
          appName: "Business Contacts",
          eligibleUsers: 90,
          adoption: 0.84,
          usage: { direct: { activatedUsers: 85, activeUsers: 76 } },
        }),
        makeApp({
          appId: "deals-crm",
          appName: "Deals CRM",
          eligibleUsers: 74,
          adoption: 0.31,
          usage: { direct: { activatedUsers: 40, activeUsers: 23 } },
        }),
      ],
    });
    const opp = detectOpportunities(tenant).find((o) => o.type === "Cross-App Adoption");
    expect(opp).toBeDefined();
    expect(opp!.description).toBe(
      "Business Contacts adoption is 84%, while Deals CRM adoption is 31%.",
    );
    expect(opp!.description).not.toMatch(/should/i);
    expect(opp!.appNames).toEqual(["Business Contacts", "Deals CRM"]);
  });

  it("does not report a cross-app pattern when both apps are adopted well", () => {
    const tenant = makeTenant({
      apps: [
        makeApp({ appId: "a", appName: "A", eligibleUsers: 90, adoption: 0.84 }),
        makeApp({ appId: "b", appName: "B", eligibleUsers: 80, adoption: 0.72 }),
      ],
    });
    expect(detectOpportunities(tenant).some((o) => o.type === "Cross-App Adoption")).toBe(false);
  });

  it("returns nothing for a healthy tenant", () => {
    const tenant = makeTenant({
      employees: 100,
      activatedUsers: 95,
      weeklyActiveUsers: 90,
      monthlyActiveUsers: 92,
      inactiveUsers: 3,
      trendPct: 0.1,
      appAdoption: 0.85,
      apps: [makeApp({ eligibleUsers: 90, adoption: 0.85 })],
    });
    expect(detectOpportunities(tenant)).toHaveLength(0);
  });

  it("every opportunity carries evidence and a detection date", () => {
    const tenant = makeTenant({
      employees: 300,
      activatedUsers: 120,
      weeklyActiveUsers: 60,
      monthlyActiveUsers: 70,
      inactiveUsers: 50,
      trendPct: -0.2,
    });
    const opps = detectOpportunities(tenant);
    expect(opps.length).toBeGreaterThan(1);
    for (const o of opps) {
      expect(o.evidence.length).toBeGreaterThan(0);
      expect(o.detectedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(o.tenantId).toBe(tenant.id);
    }
  });

  it("sorts by priority score, highest first", () => {
    const tenant = makeTenant({
      employees: 300,
      activatedUsers: 120,
      weeklyActiveUsers: 60,
      monthlyActiveUsers: 70,
      inactiveUsers: 50,
      trendPct: -0.2,
    });
    const scores = detectOpportunities(tenant).map((o) => o.priorityScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});

describe("opportunity prioritisation", () => {
  const base = {
    type: "App Adoption Gap",
    affectedUsers: 40,
    gapRatio: 0.5,
    trendPct: 0,
    healthCategory: "Healthy" as const,
  };

  it("scores a larger affected population higher", () => {
    expect(priorityScore({ ...base, affectedUsers: 140 })).toBeGreaterThan(priorityScore(base));
  });

  it("scores a larger gap higher", () => {
    expect(priorityScore({ ...base, gapRatio: 0.9 })).toBeGreaterThan(priorityScore(base));
  });

  it("scores a declining trend higher", () => {
    expect(priorityScore({ ...base, trendPct: -0.25 })).toBeGreaterThan(priorityScore(base));
  });

  it("uses Tenant health as context only", () => {
    const atRisk = priorityScore({ ...base, healthCategory: "At Risk" });
    const watch = priorityScore({ ...base, healthCategory: "Watch" });
    expect(atRisk).toBeGreaterThan(watch);
    expect(watch).toBeGreaterThan(priorityScore(base));
  });

  it("maps scores to severities", () => {
    expect(severityFor(90)).toBe("High");
    expect(severityFor(45)).toBe("Medium");
    expect(severityFor(10)).toBe("Low");
  });

  it("reports the same gap as more severe at an At-Risk Tenant", () => {
    const healthy = makeTenant({
      trendPct: -0.2,
      monthlyActiveUsers: 200,
      employees: 200,
      activatedUsers: 190,
      weeklyActiveUsers: 170,
      appAdoption: 0.85,
    });
    const atRisk = makeTenant({
      trendPct: -0.2,
      monthlyActiveUsers: 200,
      employees: 200,
      activatedUsers: 90,
      weeklyActiveUsers: 30,
      appAdoption: 0.2,
    });
    const a = detectOpportunities(healthy).find((o) => o.type === "Usage Decline")!;
    const b = detectOpportunities(atRisk).find((o) => o.type === "Usage Decline")!;
    expect(b.priorityScore).toBeGreaterThan(a.priorityScore);
  });
});
