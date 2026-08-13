import { cn } from "@/lib/utils";

export function AdoptionBar({
  value,
  className,
  showLabel = true,
  width = "w-24",
  thresholds = [0.7, 0.45],
}: {
  value: number;
  className?: string;
  showLabel?: boolean;
  width?: string;
  /** [good, fair] cut-offs — TTYB adoption uses a lower scale than app adoption */
  thresholds?: [number, number];
}) {
  const pct = Math.round(value * 100);
  const tone =
    value >= thresholds[0] ? "bg-success" : value >= thresholds[1] ? "bg-warning" : "bg-danger";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("h-1.5 overflow-hidden rounded-full bg-surface-muted", width)}>
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      {showLabel && <span className="w-9 text-right text-sm tabular text-foreground">{pct}%</span>}
    </div>
  );
}
