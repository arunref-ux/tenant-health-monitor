import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TtybPoint } from "@/domain/types";

export function TtybTrendChart({ data, height = 220 }: { data: TtybPoint[]; height?: number }) {
  const rows = data.map((p) => ({
    date: p.date.slice(5),
    users: p.users,
    interactions: p.interactions,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="ttybFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          interval={4}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--popover)",
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => [
            value.toLocaleString(),
            name === "users" ? "TTYB users" : "TTYB interactions",
          ]}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="users"
          stroke="var(--chart-3)"
          strokeWidth={2}
          fill="url(#ttybFill)"
          isAnimationActive={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="interactions"
          stroke="var(--chart-4)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function TtybLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded" style={{ background: "var(--chart-3)" }} />
        TTYB users
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded" style={{ background: "var(--chart-4)" }} />
        Interactions
      </span>
    </div>
  );
}
