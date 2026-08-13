import { clamp } from "./random";
import type { TenantUser, TtybPoint, TtybUsage, TrendDirection } from "./types";

/**
 * TTYB (Talk to Your Business) is a second *access path* into Aurumi.
 * Tenant Success only observes adoption here — no capability, business skill,
 * conversation or connector model is introduced.
 *
 *            Activated user
 *          ┌───────┴───────┐
 *      Direct App        TTYB
 *          └───────┬───────┘
 *                Both
 */

/**
 * "Direct user" = meaningful recent direct App activity.
 * Uses the existing definition already established for app activity:
 * the user is monthly-active and active in at least one Aurumi app.
 */
export function isDirectUser(user: TenantUser): boolean {
  return user.monthlyActive && user.apps.some((a) => a.active);
}

export function isTtybUser(user: TenantUser): boolean {
  return user.ttyb.used;
}

export interface TtybAggregate {
  activatedUsers: number;
  users: number;
  activeUsers: number;
  interactions: number;
  adoption: number;
  directUsers: number;
  directOnlyUsers: number;
  bothUsers: number;
  extendedReachUsers: number;
}

/**
 * Access-path aggregation. Direct and TTYB are NOT mutually exclusive:
 *   directOnly + both = directUsers
 *   extendedReach + both = ttybUsers
 */
export function aggregateTtyb(users: TenantUser[]): TtybAggregate {
  let activatedUsers = 0;
  let ttybUsers = 0;
  let activeUsers = 0;
  let interactions = 0;
  let directUsers = 0;
  let bothUsers = 0;
  let directOnlyUsers = 0;
  let extendedReachUsers = 0;

  for (const user of users) {
    if (user.activated) activatedUsers++;
    const direct = isDirectUser(user);
    const ttyb = isTtybUser(user);
    if (direct) directUsers++;
    if (ttyb) {
      ttybUsers++;
      interactions += user.ttyb.interactions;
      if (user.ttyb.recentlyActive) activeUsers++;
    }
    if (direct && ttyb) bothUsers++;
    else if (direct) directOnlyUsers++;
    else if (ttyb) extendedReachUsers++;
  }

  return {
    activatedUsers,
    users: ttybUsers,
    activeUsers,
    interactions,
    adoption: activatedUsers ? ttybUsers / activatedUsers : 0,
    directUsers,
    directOnlyUsers,
    bothUsers,
    extendedReachUsers,
  };
}

export function ttybDirection(trendPct: number): TrendDirection {
  if (trendPct > 0.04) return "up";
  if (trendPct < -0.04) return "down";
  return "flat";
}

/**
 * Deterministic 30-day TTYB history, generated relative to the existing
 * `asOfDate` mechanism (no second date system).
 */
export function buildTtybHistory(
  days: string[],
  rnd: () => number,
  endUsers: number,
  endInteractions: number,
  trendPct: number,
): TtybPoint[] {
  const span = Math.max(1, days.length - 1);
  const startUsers = endUsers / (1 + trendPct);
  const startInteractions = endInteractions / (1 + trendPct);

  return days.map((date, i) => {
    const t = i / span;
    const eased = t * t * (3 - 2 * t);
    const noise = (rnd() - 0.5) * 0.14;
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const weekendDip = weekday === 0 ? -0.3 : weekday === 6 ? -0.18 : 0;
    const factor = 1 + noise + weekendDip;
    return {
      date,
      users: Math.max(0, Math.round((startUsers + (endUsers - startUsers) * eased) * factor)),
      interactions: Math.max(
        0,
        Math.round((startInteractions + (endInteractions - startInteractions) * eased) * factor),
      ),
    };
  });
}

/** Assembles the Tenant-level TTYB read model from the user population. */
export function buildTtybUsage(
  agg: TtybAggregate,
  trendPct: number,
  history: TtybPoint[],
): TtybUsage {
  return {
    users: agg.users,
    activeUsers: agg.activeUsers,
    interactions: agg.interactions,
    adoption: clamp(agg.adoption, 0, 1),
    directUsers: agg.directUsers,
    directOnlyUsers: agg.directOnlyUsers,
    bothUsers: agg.bothUsers,
    extendedReachUsers: agg.extendedReachUsers,
    trendPct: Math.round(trendPct * 100) / 100,
    trend: ttybDirection(trendPct),
    history,
  };
}

/** TTYB adoption buckets used by filters and status colouring. */
export function ttybAdoptionBucket(adoption: number): "high" | "medium" | "low" | "none" {
  if (adoption <= 0) return "none";
  if (adoption >= 0.35) return "high";
  if (adoption >= 0.15) return "medium";
  return "low";
}

export function extendedReachBucket(
  extendedReachUsers: number,
  activatedUsers: number,
): "high" | "some" | "none" {
  if (extendedReachUsers <= 0) return "none";
  const share = activatedUsers ? extendedReachUsers / activatedUsers : 0;
  return share >= 0.08 ? "high" : "some";
}
