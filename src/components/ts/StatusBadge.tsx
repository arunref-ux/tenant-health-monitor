import { cn } from "@/lib/utils";
import type { HealthCategory, OpportunityPriority } from "@/domain/types";

const healthStyles: Record<HealthCategory, string> = {
  Healthy: "bg-success-soft text-success border-success/25",
  Watch: "bg-warning-soft text-warning border-warning/30",
  "At Risk": "bg-danger-soft text-danger border-danger/30",
};

export function HealthBadge({
  category,
  score,
  className,
}: {
  category: HealthCategory;
  score?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        healthStyles[category],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {category}
      {score !== undefined && <span className="tabular opacity-70">· {score}</span>}
    </span>
  );
}

const priorityStyles: Record<OpportunityPriority, string> = {
  High: "bg-danger-soft text-danger border-danger/30",
  Medium: "bg-warning-soft text-warning border-warning/30",
  Low: "bg-muted text-muted-foreground border-border",
};

export function PriorityBadge({ priority }: { priority: OpportunityPriority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        priorityStyles[priority],
      )}
    >
      {priority}
    </span>
  );
}

export function CategoryChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}
