import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  HeartPulse,
  Lightbulb,
  ShieldAlert,
  TrendingUp,
  Users,
  UsersRound,
  Gauge,
} from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ts/AppShell";
import { KpiCard } from "@/components/ts/KpiCard";
import { HealthBadge, PriorityBadge } from "@/components/ts/StatusBadge";
import { TrendIndicator } from "@/components/ts/TrendIndicator";
import { AdoptionBar } from "@/components/ts/AdoptionBar";
import { AdoptionTrendChart, Legend } from "@/components/ts/AdoptionTrendChart";
import { EmptyState, ErrorState, KpiSkeleton, LoadingBlock } from "@/components/ts/States";
import { overviewQuery } from "@/services/hooks";
import { toDirection } from "@/domain/generator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Aurumi Tenant Success" },
      {
        name: "description",
        content:
          "Portfolio-wide view of Tenant health, engagement, app adoption trends and open opportunities across Aurumi.",
      },
      { property: "og:title", content: "Overview — Aurumi Tenant Success" },
      {
        property: "og:description",
        content: "Tenant health, adoption trends and opportunities across the Aurumi portfolio.",
      },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const { data, isPending, error, refetch } = useQuery(overviewQuery());

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 lg:p-6">
      <PageHeader
        title="Overview"
        description="How our Tenants are doing right now — engagement, adoption and health across the portfolio."
      />

      {error ? (
        <ErrorState error={error as Error} onRetry={() => refetch()} />
      ) : isPending || !data ? (
        <>
          <KpiSkeleton count={8} />
          <LoadingBlock rows={6} />
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total Tenants" value={data.totalTenants} icon={<Building2 className="size-4" />} />
            <KpiCard
              label="Healthy Tenants"
              value={data.healthyTenants}
              tone="success"
              icon={<HeartPulse className="size-4" />}
              hint={`${pct(data.healthyTenants / data.totalTenants)} of portfolio`}
            />
            <KpiCard
              label="Needing Attention"
              value={data.watchTenants}
              tone="warning"
              icon={<Gauge className="size-4" />}
              hint="Watch category"
            />
            <KpiCard
              label="At-Risk Tenants"
              value={data.atRiskTenants}
              tone="danger"
              icon={<ShieldAlert className="size-4" />}
              hint={`${pct(data.atRiskTenants / data.totalTenants)} of portfolio`}
            />
            <KpiCard label="Total Employees" value={data.totalEmployees.toLocaleString()} icon={<UsersRound className="size-4" />} />
            <KpiCard
              label="Active Users"
              value={data.activeUsers.toLocaleString()}
              icon={<Users className="size-4" />}
              hint={`${pct(data.activeUsers / data.totalEmployees)} of employees active (30d)`}
            />
            <KpiCard
              label="Avg App Adoption"
              value={pct(data.averageAdoption)}
              icon={<TrendingUp className="size-4" />}
              hint="Weighted across eligible users"
            />
            <KpiCard label="Open Opportunities" value={data.openOpportunities} icon={<Lightbulb className="size-4" />} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard
              title="Adoption trend"
              description="Last 30 days · portfolio active users and weighted app adoption"
              action={<Legend />}
              className="xl:col-span-2"
            >
              <AdoptionTrendChart data={data.trend} />
            </SectionCard>

            <SectionCard title="Tenant health distribution" description="Share of Tenants by health category">
              <div className="space-y-4">
                <div className="flex h-2.5 overflow-hidden rounded-full">
                  <Bar value={data.healthyTenants} total={data.totalTenants} className="bg-success" />
                  <Bar value={data.watchTenants} total={data.totalTenants} className="bg-warning" />
                  <Bar value={data.atRiskTenants} total={data.totalTenants} className="bg-danger" />
                </div>
                <ul className="space-y-2.5">
                  <DistRow label="Healthy" value={data.healthyTenants} total={data.totalTenants} dot="bg-success" />
                  <DistRow label="Watch" value={data.watchTenants} total={data.totalTenants} dot="bg-warning" />
                  <DistRow label="At Risk" value={data.atRiskTenants} total={data.totalTenants} dot="bg-danger" />
                </ul>
                <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                  Health is a provisional score combining activation, engagement, adoption and 30-day
                  trend.
                </p>
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard
              title="Tenants needing attention"
              description="Lowest health scores first"
              className="xl:col-span-2"
              bodyClassName="p-0"
              action={
                <Link to="/tenants" className="text-xs font-medium text-primary hover:underline">
                  View portfolio
                </Link>
              }
            >
              {data.attention.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="No Tenants need attention" description="Every Tenant is currently healthy." />
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Tenant</th>
                      <th className="px-4 py-2 font-semibold">Health</th>
                      <th className="px-4 py-2 font-semibold">Trend</th>
                      <th className="px-4 py-2 font-semibold">Main reason</th>
                      <th className="px-4 py-2 font-semibold">Suggested attention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.attention.map((row) => (
                      <tr key={row.tenantId} className="border-b border-border/70 last:border-0 hover:bg-surface-muted">
                        <td className="px-4 py-2.5">
                          <Link
                            to="/tenants/$tenantId"
                            params={{ tenantId: row.tenantId }}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {row.tenantName}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5">
                          <HealthBadge category={row.category} score={row.score} />
                        </td>
                        <td className="px-4 py-2.5">
                          <TrendIndicator value={row.trendPct} direction={toDirection(row.trendPct)} />
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{row.reason}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{row.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>

            <SectionCard title="Top opportunities" description="Where value is being left on the table">
              {data.topOpportunities.length === 0 ? (
                <EmptyState title="No open opportunities" />
              ) : (
                <ul className="space-y-3">
                  {data.topOpportunities.map((o) => (
                    <li key={o.id} className="rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to="/tenants/$tenantId"
                          params={{ tenantId: o.tenantId }}
                          className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {o.tenantName}
                        </Link>
                        <PriorityBadge priority={o.priority} />
                      </div>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">{o.type}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{o.description}</p>
                      <div className="mt-2">
                        <AdoptionBar value={Math.min(1, o.potentialUsers / 120)} showLabel={false} width="w-full" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground tabular">
                        ~{o.potentialUsers} users of upside
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

function Bar({ value, total, className }: { value: number; total: number; className: string }) {
  return <div className={className} style={{ width: `${(value / Math.max(1, total)) * 100}%` }} />;
}

function DistRow({
  label,
  value,
  total,
  dot,
}: {
  label: string;
  value: number;
  total: number;
  dot: string;
}) {
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className={`size-2 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="tabular font-medium text-foreground">
        {value} <span className="text-muted-foreground">· {pct(value / Math.max(1, total))}</span>
      </span>
    </li>
  );
}
