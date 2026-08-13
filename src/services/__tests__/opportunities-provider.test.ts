import { afterEach, describe, expect, it } from "vitest";
import {
  allOpportunities,
  applyOpportunityFilters,
  buildDataset,
  provider,
  resetOpportunityStatuses,
  summariseOpportunities,
} from "../provider";

const records = buildDataset("2026-05-01");
const opportunities = allOpportunities(records);

afterEach(() => resetOpportunityStatuses());

describe("opportunity retrieval", () => {
  it("exposes every detected opportunity through the provider", async () => {
    const rows = await provider.listOpportunities();
    expect(rows.length).toBe(opportunities.length);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("retrieves a single opportunity by id", async () => {
    const first = opportunities[0]!;
    const found = await provider.getOpportunity(first.id);
    expect(found.id).toBe(first.id);
    expect(found.evidence.length).toBeGreaterThan(0);
    expect(found.tenantName).toBe(first.tenantName);
  });

  it("throws for an unknown opportunity", async () => {
    await expect(provider.getOpportunity("nope")).rejects.toThrow(/not found/i);
  });
});

describe("opportunity filtering and sorting", () => {
  it("filters by type, severity and tenant", async () => {
    const type = opportunities[0]!.type;
    const byType = await provider.listOpportunities({ type });
    expect(byType.every((o) => o.type === type)).toBe(true);

    const high = await provider.listOpportunities({ severity: "High" });
    expect(high.every((o) => o.severity === "High")).toBe(true);

    const tenantId = records[0]!.id;
    const byTenant = await provider.listOpportunities({ tenantId });
    expect(byTenant.every((o) => o.tenantId === tenantId)).toBe(true);
  });

  it("filters by lens and by app", () => {
    const withApp = opportunities.find((o) => o.appIds.length > 0)!;
    const rows = applyOpportunityFilters(opportunities, { appId: withApp.appIds[0]! });
    expect(rows.every((o) => o.appIds.includes(withApp.appIds[0]!))).toBe(true);

    const tenantLens = applyOpportunityFilters(opportunities, { lens: "Tenant" });
    expect(tenantLens.every((o) => o.lens === "Tenant")).toBe(true);
  });

  it("searches across title, tenant and type", () => {
    const target = opportunities[0]!;
    const rows = applyOpportunityFilters(opportunities, { search: target.tenantName });
    expect(rows.some((o) => o.id === target.id)).toBe(true);
  });

  it("sorts by priority by default and by affected users on request", () => {
    const priority = applyOpportunityFilters(opportunities).map((o) => o.priorityScore);
    expect(priority).toEqual([...priority].sort((a, b) => b - a));

    const users = applyOpportunityFilters(opportunities, {
      sortBy: "affectedUsers",
      sortDir: "asc",
    }).map((o) => o.affectedUsers);
    expect(users).toEqual([...users].sort((a, b) => a - b));
  });
});

describe("opportunity status mutation", () => {
  it("dismisses an opportunity and reflects it in later reads", async () => {
    const target = opportunities[0]!;
    expect(target.status).toBe("Open");

    const updated = await provider.setOpportunityStatus(target.id, "Dismissed");
    expect(updated.status).toBe("Dismissed");

    const reread = await provider.getOpportunity(target.id);
    expect(reread.status).toBe("Dismissed");

    const open = await provider.listOpportunities({ status: "Open" });
    expect(open.some((o) => o.id === target.id)).toBe(false);

    const dismissed = await provider.listOpportunities({ status: "Dismissed" });
    expect(dismissed.some((o) => o.id === target.id)).toBe(true);
  });

  it("reopens a dismissed opportunity", async () => {
    const target = opportunities[1]!;
    await provider.setOpportunityStatus(target.id, "Dismissed");
    await provider.setOpportunityStatus(target.id, "Open");
    expect((await provider.getOpportunity(target.id)).status).toBe("Open");
  });

  it("resets overrides without mutating the underlying dataset", async () => {
    const target = opportunities[2]!;
    await provider.setOpportunityStatus(target.id, "Dismissed");
    resetOpportunityStatuses();
    expect((await provider.getOpportunity(target.id)).status).toBe("Open");
    expect(target.status).toBe("Open");
  });

  it("summarises open vs dismissed counts", () => {
    const summary = summariseOpportunities(opportunities);
    expect(summary.open + summary.dismissed).toBe(opportunities.length);
    expect(summary.tenantsAffected).toBeGreaterThan(0);
  });
});

describe("adoption intelligence through the provider", () => {
  it("returns the portfolio app rollup", async () => {
    const intelligence = await provider.getAdoptionIntelligence();
    expect(intelligence.apps.length).toBeGreaterThan(0);
    expect(intelligence.totals.tenants).toBe(records.length);
  });

  it("returns app detail and throws for an unknown app", async () => {
    const appId = (await provider.getAdoptionIntelligence()).apps[0]!.appId;
    const detail = await provider.getAppAdoption(appId);
    expect(detail.appId).toBe(appId);
    expect(detail.tenants.length).toBeGreaterThan(0);
    await expect(provider.getAppAdoption("no-such-app")).rejects.toThrow(/not found/i);
  });
});
