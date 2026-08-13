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
import type { UsagePoint } from "@/domain/types";

export function AdoptionTrendChart({ data, height = 260 }: { data: UsagePoint[]; height?: number }) {
  const rows = data.map((p) => ({
    date: p.date.slice(5),
    activeUsers: p.activeUsers,
    adoption: Math.round(p.adoption * 1000) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="activeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
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
          width={52}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          unit="%"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--popover)",
            fontSize: 12,
          }}
          formatter={(value: number, name: string) =>
            name === "adoption" ? [`${value}%`, "App adoption"] : [value, "Active users"]
          }
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="activeUsers"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#activeFill)"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="adoption"
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded" style={{ background: "var(--chart-1)" }} />
        Active users
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded" style={{ background: "var(--chart-2)" }} />
        App adoption
      </span>
    </div>
  );
}
