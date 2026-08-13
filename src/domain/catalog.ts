import type { AurumiApp, Industry } from "./types";

export const APPS: AurumiApp[] = [
  { id: "business-contacts", name: "Business Contacts", category: "Core" },
  { id: "tasks", name: "Tasks", category: "Core" },
  { id: "employee-management", name: "Employee Management", category: "HR" },
  { id: "attendance-leave", name: "Attendance & Leave", category: "HR" },
  { id: "deals-crm", name: "Deals CRM", category: "Sales" },
  { id: "trip-meter", name: "Trip Meter", category: "Sales" },
  { id: "expense-tracker", name: "Expense Tracker", category: "Finance" },
  { id: "purchases", name: "Purchases", category: "Finance" },
  { id: "inventory", name: "Inventory", category: "Operations" },
  { id: "vendors", name: "Vendors", category: "Operations" },
];

/** Share of a tenant's employees that are eligible for each app, by industry. */
export const ELIGIBILITY: Record<string, Partial<Record<Industry, number>> & { default: number }> = {
  "business-contacts": { default: 0.9 },
  tasks: { default: 0.85 },
  "employee-management": { default: 0.25, Manufacturing: 0.2 },
  "attendance-leave": { default: 1 },
  "deals-crm": { default: 0.35, NBFC: 0.5, DSA: 0.7, Finance: 0.45, Manufacturing: 0.2 },
  "trip-meter": { default: 0.3, DSA: 0.6, Distribution: 0.55, Hospitality: 0.15 },
  "expense-tracker": { default: 0.55 },
  purchases: { default: 0.2, Distribution: 0.4, Manufacturing: 0.4, Hospitality: 0.35 },
  inventory: { default: 0.15, Distribution: 0.6, Manufacturing: 0.55, Hospitality: 0.4 },
  vendors: { default: 0.18, Distribution: 0.45, Manufacturing: 0.4 },
};

export const INDUSTRIES: Industry[] = [
  "NBFC",
  "DSA",
  "Finance",
  "Hospitality",
  "Distribution",
  "Services",
  "Manufacturing",
];

export function eligibilityShare(appId: string, industry: Industry): number {
  const row = ELIGIBILITY[appId];
  if (!row) return 0.3;
  return row[industry] ?? row.default;
}
