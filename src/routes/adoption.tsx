import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Layers, TrendingDown, Users } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ts/AppShell";
import { KpiCard } from "@/components/ts/KpiCard";
import { AdoptionBar } from "@/components/ts/AdoptionBar";
import { AdoptionTrendChart } from "@/components/ts/AdoptionTrendChart";
import { CategoryChip, HealthBadge } from "@/components/ts/StatusBadge";
import { TrendIndicator } from "@/components/ts/TrendIndicator";
import { EmptyState, ErrorState, KpiSkeleton, LoadingBlock } from "@/components/ts/States";
import { adoptionIntelligenceQuery, appAdoptionQuery } from "@/services/hooks";

interface AdoptionSearch {
  app?: string | undefined;
}

export const Route = createFileRoute("/adoption")({
  validateSearch: (search: Record<string, unknown>): AdoptionSearch => ({
    app: typeof search["app"] === "string" ? (search["app"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Adoption Intelligence — Aurumi Tenant Success" },
      {
        name: "description",
        content:
          "App-level adoption across the Aurumi Tenant portfolio: adoption distribution, 30-day trends, Tenants needing attention and cross-app adoption patterns.",
      },
      { property: "og:title", content: "Adoption Intelligence — Aurumi Tenant Success" },
      {
        property: "og:description",
        content: "App-level adoption, distribution and cross-app patterns across the portfolio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdoptionPage,
});

const pct = (v: number) => `${Math.round(v * 100)}%`;

function AdoptionPage() {
  const { app } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data, isPending, error, refetch } = useQuery(adoptionIntelligenceQuery());

  const selectedId = app ?? data?.apps[0]?.appId;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Adoption Intelligence"
        description="The Aurumi lens — how each application is adopted across the whole Tenant portfolio, and where adoption breaks down."
      />

      {error ? (
        <ErrorState error={error as Error} onRetry={() => refetch()} />
      ) : isPending || !data ? (
        <>
          <KpiSkeleton count={4} />
          <LoadingBlock rows={10} />
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Applications tracked"
              value={data.apps.length}
              icon={<Boxes className="size-4" />}
            />
            <KpiCard
              label="Eligible users"
              value={data.totals.eligibleUsers.toLocaleString()}
              icon={<Users className="size-4" />}
              hint={`Across ${data.totals.tenants} Tenants`}
            />
            <KpiCard
              label="Portfolio adoption"
              value={pct(data.totals.adoption)}
              icon={<Layers className="size-4" />}
              hint={`${data.totals.activeUsers.toLocaleString()} active users`}
            />
            <KpiCard
              label="Apps below target"
              value={data.apps.filter((a) => a.adoption < data.thresholds.medium).length}
              tone="warning"
              icon={<TrendingDown className="size-4" />}
              hint={`Adoption under ${pct(data.thresholds.medium)}`}
            />
          </div>

          <SectionCard
            title="Adoption by application"
            description="Adoption distribution shows how many Tenants sit in each bucket for that app."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Application</th>
                    <th className="px-4 py-2 font-semibold">Tenants</th>
                    <th className="px-4 py-2 font-semibold">Eligible</th>
                    <th className="px-4 py-2 font-semibold">Active</th>
                    <th className="px-4 py-2 font-semibold">Adoption</th>
                    <th className="px-4 py-2 font-semibold">Distribution</th>
                    <th className="px-4 py-2 font-semibold">Tenants with gap</th>
                    <th className="px-4 py-2 font-semibold">30-day trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.apps.map((a) => (
                    <tr
                      key={a.appId}
                      onClick={() => navigate({ search: { app: a.appId } })}
                      className={`cursor-pointer border-b border-border/70 last:border-0 hover:bg-surface-muted ${
                        a.appId === selectedId ? "bg-surface-muted" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground">{a.appName}</p>
                        <div className="mt-0.5">
                          <CategoryChip label={a.category} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 tabular text-muted-foreground">
                        {a.tenantsWithAccess}
                      </td>
                      <td className="px-4 py-2.5 tabular text-muted-foreground">
                        {a.eligibleUsers.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 tabular text-muted-foreground">
                        {a.activeUsers.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <AdoptionBar value={a.adoption} />
                      </td>
                      <td className="px-4 py-2.5">
                        <DistributionBar distribution={a.distribution} />
                      </td>
                      <td className="px-4 py-2.5 tabular text-muted-foreground">
                        {a.tenantsWithGap}
                      </td>
                      <td className="px-4 py-2.5">
                        <TrendIndicator value={a.trendPct} direction={a.trend} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {selectedId && <AppDetail appId={selectedId} />}

          <SectionCard
            title="Cross-app adoption patterns"
            description="Where Tenants adopt one Aurumi app strongly but a related app barely at all."
          >
            {data.patterns.length === 0 ? (
              <EmptyState title="No notable cross-app patterns" />
            ) : (
              <ul className="grid gap-3 lg:grid-cols-2">
                {data.patterns.map((p) => (
                  <li key={p.id} className="rounded-md border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{p.pattern}</p>
                      <span className="tabular whitespace-nowrap text-xs text-muted-foreground">
                        {p.tenantsAffected} Tenants
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                    <div className="mt-3 space-y-1.5">
                      <PatternRow name={p.appAName} value={p.appAAdoption} />
                      <PatternRow name={p.appBName} value={p.appBAdoption} />
                    </div>
                    <Link
                      to="/opportunities"
                      search={{ type: "Cross-App Adoption", appId: p.appBId }}
                      className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
                    >
                      View related opportunities →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}

function PatternRow({ name, value }: { name: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{name}</span>
      <AdoptionBar value={value} />
    </div>
  );
}

function DistributionBar({
  distribution,
}: {
  distribution: { high: number; medium: number; low: number };
}) {
  const total = Math.max(1, distribution.high + distribution.medium + distribution.low);
  const seg = [
    { key: "high", n: distribution.high, cls: "bg-success" },
    { key: "medium", n: distribution.medium, cls: "bg-warning" },
    { key: "low", n: distribution.low, cls: "bg-danger" },
  ];
  return (
    <div className="w-40">
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-muted">
        {seg.map((s) => (
          <div key={s.key} className={s.cls} style={{ width: `${(s.n / total) * 100}%` }} />
        ))}
      </div>
      <p className="mt-1 tabular text-[11px] text-muted-foreground">
        {distribution.high} high · {distribution.medium} medium · {distribution.low} low
      </p>
    </div>
  );
}

function AppDetail({ appId }: { appId: string }) {
  const { data, isPending, error, refetch } = useQuery(appAdoptionQuery(appId));

  if (error) return <ErrorState error={error as Error} onRetry={() => refetch()} />;
  if (isPending || !data) return <LoadingBlock rows={8} />;

  const attention = data.tenants
    .filter((t) => t.adoption < data.thresholds.medium)
    .slice(0, 8);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <SectionCard
        title={`${data.appName} — 30-day adoption trend`}
        description={`${data.activeUsers.toLocaleString()} active of ${data.eligibleUsers.toLocaleString()} eligible users across ${data.tenantsWithAccess} Tenants.`}
      >
        <AdoptionTrendChart data={data.trendSeries} />
      </SectionCard>

      <SectionCard
        title="Tenants needing attention"
        description={`Adoption below ${pct(data.thresholds.medium)} for ${data.appName}.`}
      >
        {attention.length === 0 ? (
          <EmptyState title="No Tenant is below the adoption threshold for this app" />
        ) : (
          <ul className="space-y-2.5">
            {attention.map((t) => (
              <li
                key={t.tenantId}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5"
              >
                <div className="min-w-0">
                  <Link
                    to="/tenants/$tenantId"
                    params={{ tenantId: t.tenantId }}
                    className="truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {t.tenantName}
                  </Link>
                  <p className="tabular mt-0.5 text-xs text-muted-foreground">
                    {t.activeUsers} of {t.eligibleUsers} eligible active · {t.gapUsers} user gap
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <HealthBadge category={t.healthCategory} score={t.healthScore} />
                  <AdoptionBar value={t.adoption} width="w-20" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
