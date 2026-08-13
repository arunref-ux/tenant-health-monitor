import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ts/AppShell";
import { KpiCard } from "@/components/ts/KpiCard";
import { CategoryChip, HealthBadge, PriorityBadge } from "@/components/ts/StatusBadge";
import { TrendIndicator } from "@/components/ts/TrendIndicator";
import { AdoptionBar } from "@/components/ts/AdoptionBar";
import { AdoptionTrendChart, Legend } from "@/components/ts/AdoptionTrendChart";
import { EmptyState, ErrorState, KpiSkeleton, LoadingBlock } from "@/components/ts/States";
import { tenantQuery } from "@/services/hooks";

export const Route = createFileRoute("/tenants/$tenantId")({
  head: () => ({
    meta: [
      { title: "Tenant 360 — Aurumi Tenant Success" },
      {
        name: "description",
        content:
          "Tenant 360: health score, engagement, per-app adoption and detected opportunities for a single Aurumi Tenant.",
      },
      { property: "og:title", content: "Tenant 360 — Aurumi Tenant Success" },
      {
        property: "og:description",
        content: "Health, engagement, app adoption and opportunities for a single Aurumi Tenant.",
      },
    ],
  }),
  component: Tenant360,
});

function Tenant360() {
  const { tenantId } = Route.useParams();
  const { data: tenant, isPending, error, refetch } = useQuery(tenantQuery(tenantId));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 lg:p-6">
      <Link
        to="/tenants"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Tenant Portfolio
      </Link>

      {error ? (
        <ErrorState error={error as Error} onRetry={() => refetch()} />
      ) : isPending || !tenant ? (
        <>
          <KpiSkeleton count={4} />
          <LoadingBlock rows={8} />
        </>
      ) : (
        <>
          <PageHeader
            title={tenant.name}
            description={`${tenant.industry} · ${tenant.employees.toLocaleString()} employees · last activity ${tenant.lastActivity}`}
            actions={
              <div className="flex items-center gap-3">
                <TrendIndicator value={tenant.trendPct} direction={tenant.trend} />
                <HealthBadge category={tenant.health.category} score={tenant.health.score} />
              </div>
            }
          />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Employees" value={tenant.employees.toLocaleString()} />
            <KpiCard
              label="Activated users"
              value={tenant.activatedUsers.toLocaleString()}
              hint={`${pct(tenant.activatedUsers / tenant.employees)} activation rate`}
            />
            <KpiCard
              label="Weekly active"
              value={tenant.weeklyActiveUsers.toLocaleString()}
              hint={`${pct(tenant.weeklyActiveUsers / tenant.activatedUsers)} of activated users`}
            />
            <KpiCard
              label="Monthly active"
              value={tenant.monthlyActiveUsers.toLocaleString()}
              hint={`${tenant.inactiveUsers} activated users dormant`}
            />
            <KpiCard label="App adoption" value={pct(tenant.appAdoption)} hint="Weighted, direct usage" />
            <KpiCard
              label="30-day trend"
              value={`${tenant.trendPct >= 0 ? "+" : ""}${Math.round(tenant.trendPct * 100)}%`}
              tone={tenant.trend === "down" ? "danger" : tenant.trend === "up" ? "success" : "default"}
            />
            <KpiCard label="Last activity" value={tenant.lastActivity} />
            <KpiCard label="Open opportunities" value={tenant.opportunities.length} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard
              title="Engagement"
              description="Last 30 days · active users and app adoption"
              action={<Legend />}
              className="xl:col-span-2"
            >
              <AdoptionTrendChart data={tenant.history} height={230} />
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <MiniStat label="Activation rate" value={pct(tenant.activatedUsers / tenant.employees)} />
                <MiniStat label="Weekly active" value={tenant.weeklyActiveUsers.toLocaleString()} />
                <MiniStat label="Monthly active" value={tenant.monthlyActiveUsers.toLocaleString()} />
                <MiniStat label="Inactive users" value={tenant.inactiveUsers.toLocaleString()} />
              </div>
            </SectionCard>

            <SectionCard
              title="Health score"
              description="Provisional model — activation, engagement, adoption, trend"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-semibold tabular">{tenant.health.score}</span>
                <HealthBadge category={tenant.health.category} />
              </div>
              <ul className="mt-4 space-y-2">
                {Object.entries(tenant.health.components).map(([key, value]) => (
                  <li key={key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="capitalize text-muted-foreground">{key}</span>
                    <span className="flex items-center gap-2">
                      <AdoptionBar
                        value={value / maxFor(key)}
                        showLabel={false}
                        width="w-20"
                      />
                      <span className="w-14 text-right tabular">
                        {value}/{maxFor(key)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 space-y-2 border-t border-border pt-3">
                {tenant.health.positives.map((s) => (
                  <Signal key={s.label} positive label={s.label} detail={s.detail} />
                ))}
                {tenant.health.negatives.map((s) => (
                  <Signal key={s.label} label={s.label} detail={s.detail} />
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard
              title="TTYB adoption"
              description="Talk to Your Business — last 30 days"
              className="xl:col-span-2"
              action={
                <TrendIndicator value={tenant.ttyb.trendPct} direction={tenant.ttyb.trend} />
              }
            >
              <TtybTrendChart data={tenant.ttyb.history} height={196} />
              <div className="mt-3 flex items-center justify-between">
                <TtybLegend />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <MiniStat label="TTYB users" value={tenant.ttyb.users.toLocaleString()} />
                <MiniStat
                  label="TTYB adoption"
                  value={pct(tenant.ttyb.adoption)}
                  hint="Of activated users"
                />
                <MiniStat
                  label="Interactions"
                  value={tenant.ttyb.interactions.toLocaleString()}
                />
                <MiniStat
                  label="Active users (7d)"
                  value={tenant.ttyb.activeUsers.toLocaleString()}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Access pattern & extended reach"
              description="Direct app usage vs TTYB for this Tenant"
            >
              <AccessPatternBar
                directOnlyUsers={tenant.ttyb.directOnlyUsers}
                bothUsers={tenant.ttyb.bothUsers}
                extendedReachUsers={tenant.ttyb.extendedReachUsers}
              />
              <dl className="mt-4 space-y-2 text-sm">
                <StatRow
                  label="Direct app users"
                  value={tenant.ttyb.directUsers.toLocaleString()}
                />
                <StatRow label="TTYB users" value={tenant.ttyb.users.toLocaleString()} />
                <StatRow label="Using both paths" value={tenant.ttyb.bothUsers.toLocaleString()} />
                <StatRow
                  label="TTYB only (extended reach)"
                  value={tenant.ttyb.extendedReachUsers.toLocaleString()}
                />
              </dl>
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                {tenant.ttyb.extendedReachUsers > 0
                  ? `TTYB reaches ${tenant.ttyb.extendedReachUsers} users with no recent direct app activity — Aurumi's reach beyond the app UI.`
                  : "No extended reach yet — every TTYB user is also an active direct app user."}
              </p>
            </SectionCard>
          </div>



          <div className="grid gap-4 xl:grid-cols-3">
            <SectionCard
              title="App adoption"
              description="Direct application usage across eligible users"
              className="xl:col-span-2"
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Application</th>
                      <th className="px-4 py-2 font-semibold">Area</th>
                      <th className="px-4 py-2 text-right font-semibold">Eligible</th>
                      <th className="px-4 py-2 text-right font-semibold">Activated</th>
                      <th className="px-4 py-2 text-right font-semibold">Active</th>
                      <th className="px-4 py-2 font-semibold">Adoption</th>
                      <th className="px-4 py-2 font-semibold">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...tenant.apps]
                      .sort((a, b) => b.adoption - a.adoption)
                      .map((app) => (
                        <tr key={app.appId} className="border-b border-border/70 last:border-0">
                          <td className="px-4 py-2.5 font-medium">{app.appName}</td>
                          <td className="px-4 py-2.5">
                            <CategoryChip label={app.category} />
                          </td>
                          <td className="px-4 py-2.5 text-right tabular">{app.eligibleUsers}</td>
                          <td className="px-4 py-2.5 text-right tabular">
                            {app.usage.direct.activatedUsers}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular">
                            {app.usage.direct.activeUsers}
                          </td>
                          <td className="px-4 py-2.5">
                            <AdoptionBar value={app.adoption} />
                          </td>
                          <td className="px-4 py-2.5">
                            <TrendIndicator value={app.trendPct} direction={app.trend} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Opportunities" description="Detected from this Tenant's usage data">
              {tenant.opportunities.length === 0 ? (
                <EmptyState
                  title="No open opportunities"
                  description="This Tenant is using Aurumi close to its potential."
                />
              ) : (
                <ul className="space-y-3">
                  {tenant.opportunities.map((o) => (
                    <li key={o.id} className="rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{o.title}</p>
                        <PriorityBadge priority={o.priority} />
                      </div>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">{o.type}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{o.description}</p>
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
const maxFor = (key: string) =>
  key === "activation" ? 25 : key === "engagement" ? 30 : key === "adoption" ? 30 : 15;

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-muted px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular">{value}</p>
    </div>
  );
}

function Signal({
  label,
  detail,
  positive = false,
}: {
  label: string;
  detail: string;
  positive?: boolean;
}) {
  const Icon = positive ? CheckCircle2 : AlertCircle;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className={`mt-0.5 size-4 shrink-0 ${positive ? "text-success" : "text-warning"}`} />
      <span>
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground"> — {detail}</span>
      </span>
    </div>
  );
}
