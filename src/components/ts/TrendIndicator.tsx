import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrendDirection } from "@/domain/types";

export function TrendIndicator({
  value,
  direction,
  className,
  showValue = true,
}: {
  value: number;
  direction: TrendDirection;
  className?: string;
  showValue?: boolean;
}) {
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : ArrowRight;
  const tone =
    direction === "up" ? "text-success" : direction === "down" ? "text-danger" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-medium tabular", tone, className)}>
      <Icon className="size-3.5" strokeWidth={2.5} />
      {showValue && `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`}
    </span>
  );
}
