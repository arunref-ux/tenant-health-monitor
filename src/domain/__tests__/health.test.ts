import { describe, expect, it } from "vitest";
import { HEALTH_WEIGHTS, calculateHealth, categorize } from "../health";
import { makeTenant } from "./fixtures";

describe("health thresholds", () => {
  it("categorises by score bands", () => {
    expect(categorize(90)).toBe("Healthy");
    expect(categorize(75)).toBe("Healthy");
    expect(categorize(74)).toBe("Watch");
    expect(categorize(55)).toBe("Watch");
    expect(categorize(54)).toBe("At Risk");
  });
});

describe("calculateHealth", () => {
  it("gives a perfect score when every component is at target", () => {
    const tenant = makeTenant({
      employees: 100,
      activatedUsers: 90,
      weeklyActiveUsers: 90,
      monthlyActiveUsers: 90,
      appAdoption: 0.8,
      trendPct: 0.2,
    });
    const health = calculateHealth(tenant);
    expect(health.score).toBe(100);
    expect(health.category).toBe("Healthy");
    expect(health.components).toEqual({
      activation: HEALTH_WEIGHTS.activation,
      engagement: HEALTH_WEIGHTS.engagement,
      adoption: HEALTH_WEIGHTS.adoption,
      trend: HEALTH_WEIGHTS.trend,
    });
  });

  it("scores a struggling tenant as At Risk with negative signals", () => {
    const tenant = makeTenant({
      employees: 100,
      activatedUsers: 40,
      weeklyActiveUsers: 10,
      monthlyActiveUsers: 15,
      appAdoption: 0.2,
      trendPct: -0.2,
    });
    const health = calculateHealth(tenant);
    expect(health.score).toBeLessThan(55);
    expect(health.category).toBe("At Risk");
    expect(health.negatives.length).toBeGreaterThan(0);
  });

  it("honours configurable weights", () => {
    const tenant = makeTenant({
      employees: 100,
      activatedUsers: 90,
      weeklyActiveUsers: 90,
      monthlyActiveUsers: 90,
      appAdoption: 0.8,
      trendPct: 0.2,
    });
    const health = calculateHealth(tenant, {
      activation: 10,
      engagement: 10,
      adoption: 10,
      trend: 10,
    });
    expect(health.score).toBe(40);
    expect(health.components.adoption).toBe(10);
  });

  it("handles a tenant with no employees without dividing by zero", () => {
    const health = calculateHealth(
      makeTenant({ employees: 0, activatedUsers: 0, weeklyActiveUsers: 0, appAdoption: 0 }),
    );
    expect(Number.isFinite(health.score)).toBe(true);
    expect(health.components.activation).toBe(0);
  });
});
