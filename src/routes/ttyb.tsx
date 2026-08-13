import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, MessageSquare, Search, Sparkles, UserPlus, Users } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ts/AppShell";
import { AccessPatternBar } from "@/components/ts/AccessPatternBar";
import { AdoptionBar } from "@/components/ts/AdoptionBar";
import { KpiCard } from "@/components/ts/KpiCard";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ts/States";
import { TrendIndicator } from "@/components/ts/TrendIndicator";
import { TtybLegend, TtybTrendChart } from "@/components/ts/TtybTrendChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDUSTRIES } from "@/domain/catalog";
import type { PortfolioFilters } from "@/domain/types";
import { overviewQuery, tenantsQuery } from "@/services/hooks";

export const Route = createFileRoute("/ttyb")({
  head: () => ({
    meta: [
      { title: "TTYB Adoption — Aurumi Tenant Success" },
      {
        name: "description",
        content:
          "Track Talk to Your Business adoption across Aurumi Tenants: TTYB users, interactions, access patterns and extended reach beyond direct app usage.",
      },
      { property: "og:title", content: "TTYB Adoption — Aurumi Tenant Success" },
      {
        property: "og:description",
        content:
          "TTYB users, interactions, access patterns and extended reach for every Aurumi Tenant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TtybPage,
});

const SORTS: Array<{ value: NonNullable<PortfolioFilters["sortBy"]>; label: string }> = [
  { value: "ttybAdoption", label: "TTYB adoption" },
  { value: "ttybUsers", label: "TTYB users" },
  { value: "ttybInteractions", label: "Interactions" },
  { value: "ttybExtendedReach", label: "Extended reach" },
  { value: "ttybTrend", label: "TTYB trend" },
  { value: "name", label: "Tenant name" },
  { value: "appAdoption", label: "App adoption" },
];

const pct = (v: number) => `${Math.round(v * 100)}%`;

function TtybPage() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<NonNullable<PortfolioFilters["industry"]>>("all");
  const [ttybAdoption, setTtybAdoption] =
    useState<NonNullable<PortfolioFilters["ttybAdoption"]>>("all");
  const [extendedReach, setExtendedReach] =
    useState<NonNullable<PortfolioFilters["extendedReach"]>>("all");
  const [ttybTrend, setTtybTrend] = useState<NonNullable<PortfolioFilters["ttybTrend"]>>("all");
  const [sortBy, setSortBy] = useState<NonNullable<PortfolioFilters["sortBy"]>>("ttybAdoption");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filters = useMemo<PortfolioFilters>(
    () => ({ search, industry, ttybAdoption, extendedReach, ttybTrend, sortBy, sortDir }),
    [search, industry, ttybAdoption, extendedReach, ttybTrend, sortBy, sortDir],
  );

  const overview = useQuery(overviewQuery());
  const tenants = useQuery(tenantsQuery(filters));

  const filtersActive =
    search !== "" ||
    industry !== "all" ||
    ttybAdoption !== "all" ||
    extendedReach !== "all" ||
    ttybTrend !== "all";

  const reset = () => {
    setSearch("");
    setIndustry("all");
    setTtybAdoption("all");
    setExtendedReach("all");
    setTtybTrend("all");
  };

  const t = overview.data?.ttyb;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 lg:p-6">
      <PageHeader
        title="TTYB Adoption"
        description="Talk to Your Business as a second access path into Aurumi — who uses it, how much, and who it reaches that Apps alone do not."
      />

      {overview.error ? (
        <ErrorState error={overview.error as Error} onRetry={() => overview.refetch()} />
      ) : !t ? (
        <LoadingBlock rows={4} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="TTYB users (30d)"
              value={t.users.toLocaleString()}
              hint={`${t.tenantsWithTtyb} Tenants with TTYB activity`}
              icon={<Users className="size-4" />}
            />
            <KpiCard
              label="TTYB adoption"
              value={pct(t.adoption)}
              hint="Of activated Aurumi users"
              icon={<Sparkles className="size-4" />}
              tone={t.adoption >= 0.3 ? "success" : t.adoption >= 0.15 ? "warning" : "danger"}
            />
            <KpiCard
              label="Interactions (30d)"
              value={t.interactions.toLocaleString()}
              hint={`${t.activeUsers.toLocaleString()} users active in last 7 days`}
              icon={<MessageSquare className="size-4" />}
            />
            <KpiCard
              label="Extended reach"
              value={t.extendedReachUsers.toLocaleString()}
              hint="TTYB-only users with no recent direct app usage"
              icon={<UserPlus className="size-4" />}
              tone="success"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard
              title="TTYB usage — last 30 days"
              description="Portfolio TTYB users and interactions per day."
              className="lg:col-span-2"
              action={<TtybLegend />}
            >
              <TtybTrendChart data={t.trend} />
              <p className="mt-2 text-xs text-muted-foreground">
                TTYB users {t.growthPct >= 0 ? "grew" : "fell"} {pct(Math.abs(t.growthPct))} across
                the period.
              </p>
            </SectionCard>

            <SectionCard
              title="Access patterns"
              description="How Tenant users reach Aurumi."
            >
              <AccessPatternBar
                directOnlyUsers={t.directOnlyUsers}
                bothUsers={t.bothUsers}
                extendedReachUsers={t.extendedReachUsers}
              />
              <dl className="mt-4 space-y-2 text-sm">
                <Row label="Direct app users" value={t.directUsers.toLocaleString()} />
                <Row label="TTYB users" value={t.users.toLocaleString()} />
                <Row label="Using both paths" value={t.bothUsers.toLocaleString()} />
                <Row
                  label="TTYB only (extended reach)"
                  value={t.extendedReachUsers.toLocaleString()}
                />
              </dl>
              {t.signals.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-border pt-3">
                  {t.signals.map((s) => (
                    <div key={s.label} className="text-xs">
                      <p
                        className={
                          s.tone === "danger"
                            ? "font-medium text-danger"
                            : s.tone === "warning"
                              ? "font-medium text-warning"
                              : "font-medium text-foreground"
                        }
                      >
                        {s.label}
                      </p>
                      <p className="text-muted-foreground">{s.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Tenant or industry"
            className="pl-8"
            aria-label="Search Tenants"
          />
        </div>
        <TtybSelect
          label="Industry"
          value={industry}
          onChange={(v) => setIndustry(v as typeof industry)}
          options={[["all", "All industries"], ...INDUSTRIES.map((i) => [i, i] as [string, string])]}
        />
        <TtybSelect
          label="TTYB adoption"
          value={ttybAdoption}
          onChange={(v) => setTtybAdoption(v as typeof ttybAdoption)}
          options={[
            ["all", "All TTYB adoption"],
            ["high", "High (≥35%)"],
            ["medium", "Medium (15–34%)"],
            ["low", "Low (<15%)"],
            ["none", "No TTYB usage"],
          ]}
        />
        <TtybSelect
          label="Extended reach"
          value={extendedReach}
          onChange={(v) => setExtendedReach(v as typeof extendedReach)}
          options={[
            ["all", "All reach"],
            ["high", "Significant (≥8%)"],
            ["some", "Some"],
            ["none", "None"],
          ]}
        />
        <TtybSelect
          label="TTYB trend"
          value={ttybTrend}
          onChange={(v) => setTtybTrend(v as typeof ttybTrend)}
          options={[
            ["all", "All TTYB trends"],
            ["up", "Increasing"],
            ["flat", "Stable"],
            ["down", "Declining"],
          ]}
        />
        <TtybSelect
          label="Sort"
          value={sortBy}
          onChange={(v) => setSortBy(v as typeof sortBy)}
          options={SORTS.map((s) => [s.value, s.label] as [string, string])}
        />
        <Button
          variant="outline"
          size="icon"
          aria-label="Toggle sort direction"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        >
          <ArrowUpDown className="size-4" />
        </Button>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={reset}>
            Clear
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {tenants.error ? (
          <div className="p-4">
            <ErrorState error={tenants.error as Error} onRetry={() => tenants.refetch()} />
          </div>
        ) : tenants.isPending ? (
          <LoadingBlock rows={8} className="p-4" />
        ) : tenants.data.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No Tenants match your filters"
              description="Try clearing the search or relaxing a filter."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Tenant</th>
                  <th className="px-4 py-2.5 font-semibold">Industry</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Activated</th>
                  <th className="px-4 py-2.5 text-right font-semibold">TTYB users</th>
                  <th className="px-4 py-2.5 font-semibold">TTYB adoption</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Interactions</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Active 7d</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Extended reach</th>
                  <th className="px-4 py-2.5 font-semibold">Access pattern</th>
                  <th className="px-4 py-2.5 font-semibold">TTYB trend</th>
                </tr>
              </thead>
              <tbody>
                {tenants.data.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/70 last:border-0 hover:bg-surface-muted"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        to="/tenants/$tenantId"
                        params={{ tenantId: row.id }}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.industry}</td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {row.activatedUsers.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {row.ttyb.users.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <AdoptionBar value={row.ttyb.adoption} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {row.ttyb.interactions.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {row.ttyb.activeUsers.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {row.ttyb.extendedReachUsers.toLocaleString()}
                    </td>
                    <td className="w-[160px] px-4 py-2.5">
                      <AccessPatternBar
                        compact
                        directOnlyUsers={row.ttyb.directOnlyUsers}
                        bothUsers={row.ttyb.bothUsers}
                        extendedReachUsers={row.ttyb.extendedReachUsers}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <TrendIndicator value={row.ttyb.trendPct} direction={row.ttyb.trend} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular text-foreground">{value}</dd>
    </div>
  );
}

function TtybSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[172px]" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
