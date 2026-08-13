import { cn } from "@/lib/utils";

export function AdoptionBar({
  value,
  className,
  showLabel = true,
  width = "w-24",
}: {
  value: number;
  className?: string;
  showLabel?: boolean;
  width?: string;
}) {
  const pct = Math.round(value * 100);
  const tone =
    value >= 0.7 ? "bg-success" : value >= 0.45 ? "bg-warning" : "bg-danger";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("h-1.5 overflow-hidden rounded-full bg-surface-muted", width)}>
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      {showLabel && <span className="w-9 text-right text-sm tabular text-foreground">{pct}%</span>}
    </div>
  );
}
