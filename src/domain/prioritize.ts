import type {
  HealthCategory,
  Opportunity,
  OpportunitySeverity,
} from "./types";

/**
 * Opportunity prioritisation.
 *
 * Deliberately a small, transparent weighting — not a scoring model. It lives
 * outside the UI and outside detection so it can be retuned or replaced with a
 * real ranking service without touching either.
 */
export interface PriorityWeights {
  /** size of the affected user population */
  reach: number;
  /** how large the observed gap is (0..1 of the relevant population) */
  gap: number;
  /** declining usage makes an observation more urgent */
  decline: number;
  /** Tenant health context */
  health: number;
  /** per-type baseline importance */
  base: number;
}

export const PRIORITY_WEIGHTS: PriorityWeights = {
  reach: 34,
  gap: 26,
  decline: 16,
  health: 14,
  base: 10,
};

/** Population size at which "reach" is considered fully saturated. */
export const REACH_SATURATION = 150;

const TYPE_BASE: Record<string, number> = {
  "Usage Decline": 1,
  "Activation Gap": 0.85,
  "Engagement Gap": 0.8,
  "App Adoption Gap": 0.7,
  "Cross-App Adoption": 0.55,
  "TTYB Adoption": 0.5,
};

const HEALTH_CONTEXT: Record<HealthCategory, number> = {
  "At Risk": 1,
  Watch: 0.55,
  Healthy: 0.1,
};

export interface PriorityInput {
  type: string;
  affectedUsers: number;
  /** 0..1 — share of the relevant population the gap represents */
  gapRatio: number;
  /** relevant 30-day trend; negative means declining */
  trendPct: number;
  healthCategory: HealthCategory;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 0..100 priority score. Higher deserves attention first. */
export function priorityScore(
  input: PriorityInput,
  weights: PriorityWeights = PRIORITY_WEIGHTS,
): number {
  const reach = clamp01(input.affectedUsers / REACH_SATURATION);
  const gap = clamp01(input.gapRatio);
  const decline = clamp01(-input.trendPct / 0.3);
  const health = HEALTH_CONTEXT[input.healthCategory];
  const base = TYPE_BASE[input.type] ?? 0.5;

  const score =
    reach * weights.reach +
    gap * weights.gap +
    decline * weights.decline +
    health * weights.health +
    base * weights.base;

  return Math.round(Math.min(100, score));
}

export function severityFor(score: number): OpportunitySeverity {
  if (score >= 58) return "High";
  if (score >= 36) return "Medium";
  return "Low";
}

const SEVERITY_RANK: Record<OpportunitySeverity, number> = { High: 0, Medium: 1, Low: 2 };

export function severityRank(severity: OpportunitySeverity): number {
  return SEVERITY_RANK[severity];
}

/** Highest priority first, ties broken by affected population. */
export function byPriority(a: Opportunity, b: Opportunity): number {
  return b.priorityScore - a.priorityScore || b.affectedUsers - a.affectedUsers;
}
