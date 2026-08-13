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

/** One day of simulated TTYB usage for a Tenant. */
export interface TtybPoint {
  date: string; // ISO yyyy-mm-dd
  users: number;
  interactions: number;
}

/**
 * Tenant-level TTYB read model (iteration 2).
 * TTYB is a second *access path* into Aurumi, not a separate population:
 * the same user may use Apps directly, TTYB, or both.
 */
export interface TtybUsage {
  /** unique users with TTYB activity in the last 30 days */
  users: number;
  /** users with TTYB activity in the last 7 days */
  activeUsers: number;
  /** simulated TTYB interactions in the last 30 days */
  interactions: number;
  /** ttybUsers / activatedUsers, 0..1 */
  adoption: number;
  /** users with meaningful recent direct App activity */
  directUsers: number;
  /** direct App activity but no TTYB activity */
  directOnlyUsers: number;
  /** both direct App activity and TTYB activity */
  bothUsers: number;
  /** TTYB activity but no meaningful recent direct App activity */
  extendedReachUsers: number;
  /** relative change in TTYB users over the last 30 days */
  trendPct: number;
  trend: TrendDirection;
  history: TtybPoint[];
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
  | "TTYB Adoption Opportunity"
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
  ttyb: TtybUsage;
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
  /** TTYB adoption bucket (ttybUsers / activatedUsers) */
  ttybAdoption?: "all" | "high" | "medium" | "low" | "none";
  /** TTYB extended reach as a share of activated users */
  extendedReach?: "all" | "high" | "some" | "none";
  ttybTrend?: "all" | TrendDirection;
  sortBy?: keyof Pick<
    Tenant,
    "name" | "employees" | "monthlyActiveUsers" | "appAdoption" | "trendPct"
  >
    | "health"
    | "opportunities"
    | "activatedUsers"
    | "ttybUsers"
    | "ttybAdoption"
    | "ttybExtendedReach"
    | "ttybInteractions"
    | "ttybTrend";
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
  ttyb: TtybOverview;
}

/** Portfolio-level TTYB rollup shown on the Overview and the TTYB page. */
export interface TtybOverview {
  users: number;
  activeUsers: number;
  interactions: number;
  /** portfolio TTYB users / activated users */
  adoption: number;
  extendedReachUsers: number;
  directUsers: number;
  bothUsers: number;
  directOnlyUsers: number;
  /** 30-day change in TTYB users across the portfolio */
  growthPct: number;
  trend: TtybPoint[];
  /** concise, evidence-based adoption signals (no business-value claims) */
  signals: Array<{ label: string; detail: string; tone: "warning" | "danger" | "default" }>;
  tenantsWithTtyb: number;
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

/** Minimal TTYB state for a single user — no intents/conversations/capabilities. */
export interface UserTtybState {
  /** used TTYB at least once in the last 30 days */
  used: boolean;
  /** TTYB interactions in the last 30 days */
  interactions: number;
  /** days since the last TTYB interaction, null when never used */
  lastUsedDaysAgo: number | null;
  /** TTYB activity within the last 7 days */
  recentlyActive: boolean;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  /** activated the Aurumi platform at all */
  activated: boolean;
  weeklyActive: boolean;
  monthlyActive: boolean;
  apps: UserAppState[];
  ttyb: UserTtybState;
}
