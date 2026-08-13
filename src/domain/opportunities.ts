import type { Opportunity, Tenant } from "./types";

/**
 * Simple rule-based opportunity detection over simulated tenant data.
 * Lives outside the UI so rules can be replaced by a real service later.
 */
export function detectOpportunities(tenant: Tenant): Opportunity[] {
  const out: Opportunity[] = [];
  const add = (o: Omit<Opportunity, "tenantId" | "tenantName">) =>
    out.push({ ...o, tenantId: tenant.id, tenantName: tenant.name });

  // 1. Adoption gaps — many eligible users, few active.
  for (const app of tenant.apps) {
    const active = app.usage.direct.activeUsers;
    const gap = app.eligibleUsers - active;
    if (app.adoption < 0.5 && gap >= 12) {
      add({
        id: `${tenant.id}-adoption-${app.appId}`,
        type: "Adoption Gap",
        title: `${app.appName} adoption opportunity`,
        description: `${app.eligibleUsers} employees are eligible for ${app.appName}, but only ${active} are active (${Math.round(app.adoption * 100)}%).`,
        priority: app.adoption < 0.3 && gap >= 30 ? "High" : "Medium",
        potentialUsers: gap,
      });
    }
  }

  // 2. Usage decline over 30 days.
  if (tenant.trendPct <= -0.08) {
    const lost = Math.max(1, Math.round(tenant.monthlyActiveUsers * Math.abs(tenant.trendPct)));
    add({
      id: `${tenant.id}-decline`,
      type: "Usage Decline",
      title: "Usage declining over 30 days",
      description: `Active users fell ${Math.round(Math.abs(tenant.trendPct) * 100)}% in the last 30 days (~${lost} fewer active users).`,
      priority: tenant.trendPct <= -0.15 ? "High" : "Medium",
      potentialUsers: lost,
    });
  }

  // 3. Activation gap — employees never onboarded.
  const notActivated = tenant.employees - tenant.activatedUsers;
  const activationRate = tenant.activatedUsers / Math.max(1, tenant.employees);
  if (activationRate < 0.8 && notActivated >= 15) {
    add({
      id: `${tenant.id}-activation`,
      type: "Activation Opportunity",
      title: "Employee activation opportunity",
      description: `${notActivated} of ${tenant.employees} employees have never activated Aurumi (${Math.round(activationRate * 100)}% activated).`,
      priority: activationRate < 0.65 ? "High" : "Low",
      potentialUsers: notActivated,
    });
  }

  // 4. Engagement gap — activated but dormant.
  if (tenant.inactiveUsers >= 15) {
    add({
      id: `${tenant.id}-engagement`,
      type: "Feature Adoption",
      title: "Dormant activated users",
      description: `${tenant.inactiveUsers} activated employees have not used Aurumi in the last 30 days.`,
      priority: tenant.inactiveUsers > tenant.activatedUsers * 0.3 ? "Medium" : "Low",
      potentialUsers: tenant.inactiveUsers,
    });
  }

  const rank = { High: 0, Medium: 1, Low: 2 } as const;
  return out.sort(
    (a, b) => rank[a.priority] - rank[b.priority] || b.potentialUsers - a.potentialUsers,
  );
}
