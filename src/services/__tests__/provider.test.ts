import { describe, expect, it } from "vitest";
import { applyFilters, buildDataset, provider } from "../provider";

const AS_OF = "2026-05-01";
const records = buildDataset(AS_OF);

describe("provider dataset", () => {
  it("builds a coherent portfolio of tenants", () => {
    expect(records.length).toBeGreaterThanOrEqual(15);
    for (const t of records) {
      expect(t.health.score).toBeGreaterThanOrEqual(0);
      expect(t.health.score).toBeLessThanOrEqual(100);
      expect(t.appAdoption).toBeGreaterThanOrEqual(0);
      expect(t.appAdoption).toBeLessThanOrEqual(1);
    }
  });

  it("caches per as-of date, so repeated reads are stable", () => {
    expect(buildDataset(AS_OF)).toBe(records);
  });
});

describe("filtering and sorting", () => {
  it("filters by search across name and industry", () => {
    const rows = applyFilters(records, { search: "abc" });
    expect(rows.every((t) => t.name.toLowerCase().includes("abc"))).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("filters by industry and health category", () => {
    const rows = applyFilters(records, { industry: "NBFC" });
    expect(rows.every((t) => t.industry === "NBFC")).toBe(true);

    const atRisk = applyFilters(records, { health: "At Risk" });
    expect(atRisk.every((t) => t.health.category === "At Risk")).toBe(true);
  });

  it("sorts by name ascending and health descending", () => {
    const byName = applyFilters(records, { sortBy: "name", sortDir: "asc" }).map((t) => t.name);
    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b)));

    const byHealth = applyFilters(records, { sortBy: "health", sortDir: "desc" }).map(
      (t) => t.health.score,
    );
    expect(byHealth).toEqual([...byHealth].sort((a, b) => b - a));
  });

  it("returns everything when filters are 'all'", () => {
    expect(applyFilters(records, { health: "all", industry: "all", trend: "all" })).toHaveLength(
      records.length,
    );
  });
});

describe("provider API", () => {
  it("retrieves a tenant by id", async () => {
    const first = records[0]!;
    const tenant = await provider.getTenant(first.id);
    expect(tenant.id).toBe(first.id);
    expect(tenant.opportunities).toBeDefined();
  });

  it("throws for an unknown tenant", async () => {
    await expect(provider.getTenant("does-not-exist")).rejects.toThrow(/not found/i);
  });

  it("lists tenants through the provider boundary", async () => {
    const rows = await provider.listTenants({ industry: "Finance" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((t) => t.industry === "Finance")).toBe(true);
  });

  it("summarises the portfolio in the overview", async () => {
    const overview = await provider.getOverview();
    expect(overview.totalTenants).toBeGreaterThan(0);
    expect(
      overview.healthyTenants + overview.watchTenants + overview.atRiskTenants,
    ).toBe(overview.totalTenants);
    expect(overview.trend).toHaveLength(30);
  });
});
