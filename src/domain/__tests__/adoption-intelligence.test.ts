import { describe, expect, it } from "vitest";
import {
  ADOPTION_THRESHOLDS,
  adoptionBand,
  appTrendSeries,
  buildAdoptionIntelligence,
  buildAppDetail,
  buildAppRow,
} from "../adoption-intelligence";
import { buildDataset } from "@/services/provider";

const records = buildDataset("2026-05-01");
const intelligence = buildAdoptionIntelligence(records);

describe("adoption bands", () => {
  it("buckets adoption against the configured thresholds", () => {
    expect(adoptionBand(0.9)).toBe("high");
    expect(adoptionBand(ADOPTION_THRESHOLDS.high)).toBe("high");
    expect(adoptionBand(ADOPTION_THRESHOLDS.medium)).toBe("medium");
    expect(adoptionBand(0.01)).toBe("low");
  });
});

describe("buildAdoptionIntelligence", () => {
  it("aggregates every app in the catalog, sorted by weakest adoption first", () => {
    expect(intelligence.apps.length).toBeGreaterThan(0);
    const adoptions = intelligence.apps.map((a) => a.adoption);
    expect(adoptions).toEqual([...adoptions].sort((a, b) => a - b));
  });

  it("totals match the sum of the per-app rows", () => {
    const eligible = intelligence.apps.reduce((s, a) => s + a.eligibleUsers, 0);
    const active = intelligence.apps.reduce((s, a) => s + a.activeUsers, 0);
    expect(intelligence.totals.eligibleUsers).toBe(eligible);
    expect(intelligence.totals.activeUsers).toBe(active);
    expect(intelligence.totals.adoption).toBeCloseTo(active / eligible, 10);
    expect(intelligence.totals.tenants).toBe(records.length);
  });

  it("keeps adoption within bounds and distribution consistent", () => {
    for (const app of intelligence.apps) {
      expect(app.adoption).toBeGreaterThanOrEqual(0);
      expect(app.adoption).toBeLessThanOrEqual(1);
      expect(app.activeUsers).toBeLessThanOrEqual(app.eligibleUsers);
      const { high, medium, low } = app.distribution;
      expect(high + medium + low).toBe(app.tenantsWithAccess);
      expect(app.tenantsWithGap).toBeLessThanOrEqual(low);
    }
  });

  it("cross-app patterns compare two different apps with a positive delta", () => {
    for (const p of intelligence.patterns) {
      expect(p.appAId).not.toBe(p.appBId);
      expect(p.delta).toBeGreaterThan(0);
      expect(p.appAAdoption - p.appBAdoption).toBeCloseTo(p.delta, 10);
    }
  });
});

describe("app detail aggregation", () => {
  const appId = intelligence.apps[0]!.appId;
  const detail = buildAppDetail(records, appId);

  it("extends the portfolio row with tenants and a trend series", () => {
    const row = buildAppRow(records, appId);
    expect(detail.appId).toBe(row.appId);
    expect(detail.adoption).toBeCloseTo(row.adoption, 10);
    expect(detail.tenantsWithAccess).toBe(row.tenantsWithAccess);
    expect(detail.tenants).toHaveLength(row.tenantsWithAccess);
    expect(detail.thresholds).toEqual(ADOPTION_THRESHOLDS);
    expect(detail.trendSeries).toHaveLength(records[0]!.history.length);
  });

  it("orders tenants by the largest gap first", () => {
    const gaps = detail.tenants.map((t) => t.gapUsers);
    expect(gaps).toEqual([...gaps].sort((a, b) => b - a));
  });

  it("per-tenant eligible users sum to the portfolio total", () => {
    const eligible = detail.tenants.reduce((s, t) => s + t.eligibleUsers, 0);
    expect(eligible).toBe(detail.eligibleUsers);
  });

  it("returns an empty aggregation for an app nobody has access to", () => {
    const empty = buildAppDetail([], appId);
    expect(empty.tenantsWithAccess).toBe(0);
    expect(empty.adoption).toBe(0);
  });

  it("keeps the trend series adoption within bounds", () => {
    for (const point of appTrendSeries(records, appId)) {
      expect(point.adoption).toBeGreaterThanOrEqual(0);
      expect(point.adoption).toBeLessThanOrEqual(1);
    }
  });
});
