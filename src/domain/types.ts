// Core domain models for Aurumi Tenant Success.
// These types are the contract between the UI and the data provider.
// A real backend can replace the simulated provider without UI changes.

export type Industry =
  | "NBFC"
  | "DSA"
  | "Finance"
  | "Hospitality"
  | "Distribution"
  | "Services"
  | "Manufacturing";

export type HealthCategory = "Healthy" | "Watch" | "At Risk";

export type TrendDirection = "up" | "flat" | "down";

export type AppCategory = "Core" | "Sales" | "HR" | "Finance" | "Operations";

export interface AurumiApp {
  id: string;
  name: string;
  category: AppCategory;
}

/**
 * Usage is deliberately modelled as a container of access paths.
 * Iteration 1 only populates `direct`. A `ttyb` path can be added later
 * without changing the shape consumed by the UI.
 */
export interface UsageBreakdown {
  direct: {
    activatedUsers: number;
    activeUsers: number;
  };
  // future: ttyb?: { activeUsers: number }
}

export interface TenantAppUsage {
  appId: string;
  appName: string;
  category: AppCategory;
  eligibleUsers: number;
  usage: UsageBreakdown;
  /** activeUsers / eligibleUsers, 0..1 */
  adoption: number;
  /** relative change over the last 30 days, e.g. 0.12 = +12% */
  trendPct: number;
  trend: TrendDirection;
}

export interface UsagePoint {
  date: string; // ISO yyyy-mm-dd
  activeUsers: number;
  /** 0..1 */
  adoption: number;
}

export interface HealthSignal {
  label: string;
  detail: string;
}

export interface HealthScore {
  score: number;
  category: HealthCategory;
  components: {
    activation: number;
    engagement: number;
    adoption: number;
    trend: number;
  };
  positives: HealthSignal[];
  negatives: HealthSignal[];
}

export type OpportunityType =
  | "Adoption Gap"
  | "Usage Decline"
  | "Activation Opportunity"
  | "Engagement Opportunity";

export type OpportunityPriority = "High" | "Medium" | "Low";

export interface Opportunity {
  id: string;
  tenantId: string;
  tenantName: string;
  type: OpportunityType;
  title: string;
  description: string;
  priority: OpportunityPriority;
  /** estimated additional users that could be activated/reactivated */
  potentialUsers: number;
}

export interface Tenant {
  id: string;
  name: string;
  industry: Industry;
  employees: number;
  activatedUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  inactiveUsers: number;
  /** 0..1 weighted overall app adoption */
  appAdoption: number;
  trendPct: number;
  trend: TrendDirection;
  lastActivity: string; // ISO date
  apps: TenantAppUsage[];
  history: UsagePoint[];
}

export interface TenantRecord extends Tenant {
  health: HealthScore;
  opportunities: Opportunity[];
}

export interface PortfolioFilters {
  search?: string;
  health?: HealthCategory | "all";
  industry?: Industry | "all";
  adoption?: "all" | "high" | "medium" | "low";
  trend?: "all" | TrendDirection;
  sortBy?: keyof Pick<
    Tenant,
    "name" | "employees" | "monthlyActiveUsers" | "appAdoption" | "trendPct"
  > | "health" | "opportunities";
  sortDir?: "asc" | "desc";
}

export interface OverviewSummary {
  totalTenants: number;
  healthyTenants: number;
  watchTenants: number;
  atRiskTenants: number;
  totalEmployees: number;
  activeUsers: number;
  averageAdoption: number;
  openOpportunities: number;
  trend: UsagePoint[];
  attention: Array<{
    tenantId: string;
    tenantName: string;
    category: HealthCategory;
    score: number;
    trendPct: number;
    reason: string;
    suggestion: string;
  }>;
  topOpportunities: Opportunity[];
}

/**
 * Minimal user-level model (iteration 1.1).
 * Kept intentionally small: eligibility / activation / activity per app only.
 */
export interface UserAppState {
  appId: string;
  eligible: boolean;
  activated: boolean;
  active: boolean;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  /** activated the Aurumi platform at all */
  activated: boolean;
  weeklyActive: boolean;
  monthlyActive: boolean;
  apps: UserAppState[];
}
