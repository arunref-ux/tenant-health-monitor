interface AccessPatternBarProps {
  directOnlyUsers: number;
  bothUsers: number;
  extendedReachUsers: number;
  compact?: boolean;
}

/**
 * Access-path composition for a Tenant: Direct only / Both / TTYB only.
 * "TTYB only" is Extended Reach — users Aurumi would not otherwise reach.
 */
export function AccessPatternBar({
  directOnlyUsers,
  bothUsers,
  extendedReachUsers,
  compact = false,
}: AccessPatternBarProps) {
  const total = directOnlyUsers + bothUsers + extendedReachUsers;
  const pct = (v: number) => (total ? (v / total) * 100 : 0);

  const segments = [
    { key: "direct", label: "Direct only", value: directOnlyUsers, color: "var(--chart-1)" },
    { key: "both", label: "Both", value: bothUsers, color: "var(--chart-4)" },
    { key: "ttyb", label: "TTYB only", value: extendedReachUsers, color: "var(--chart-3)" },
  ];

  return (
    <div className="space-y-2">
      <div
        className={`flex w-full overflow-hidden rounded-full bg-muted ${compact ? "h-1.5" : "h-2.5"}`}
        role="img"
        aria-label={`Access pattern: ${directOnlyUsers} direct only, ${bothUsers} both, ${extendedReachUsers} TTYB only`}
      >
        {total === 0 ? null : (
          segments.map((s) => (
            <div key={s.key} style={{ width: `${pct(s.value)}%`, background: s.color }} />
          ))
        )}
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {segments.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ background: s.color }} />
              {s.label}
              <span className="font-medium text-foreground tabular-nums">
                {s.value.toLocaleString()}
              </span>
              <span className="tabular-nums">({Math.round(pct(s.value))}%)</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
