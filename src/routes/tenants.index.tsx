import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, Search } from "lucide-react";
import { PageHeader } from "@/components/ts/AppShell";
import { HealthBadge } from "@/components/ts/StatusBadge";
import { TrendIndicator } from "@/components/ts/TrendIndicator";
import { AdoptionBar } from "@/components/ts/AdoptionBar";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ts/States";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDUSTRIES } from "@/domain/catalog";
import type { PortfolioFilters } from "@/domain/types";
import { tenantsQuery } from "@/services/hooks";

export const Route = createFileRoute("/tenants/")({
  head: () => ({
    meta: [
      { title: "Tenant Portfolio — Aurumi Tenant Success" },
      {
        name: "description",
        content:
          "Search, filter and sort every Aurumi Tenant by health, industry, adoption and 30-day usage trend.",
      },
      { property: "og:title", content: "Tenant Portfolio — Aurumi Tenant Success" },
      {
        property: "og:description",
        content: "Every Aurumi Tenant with health, adoption and usage trend at a glance.",
      },
    ],
  }),
  component: TenantPortfolio,
});

const SORTS: Array<{ value: NonNullable<PortfolioFilters["sortBy"]>; label: string }> = [
  { value: "health", label: "Health score" },
  { value: "name", label: "Tenant name" },
  { value: "employees", label: "Employees" },
  { value: "monthlyActiveUsers", label: "Active users" },
  { value: "appAdoption", label: "App adoption" },
  { value: "trendPct", label: "30-day trend" },
  { value: "opportunities", label: "Opportunities" },
];

function TenantPortfolio() {
  const [search, setSearch] = useState("");
  const [health, setHealth] = useState<NonNullable<PortfolioFilters["health"]>>("all");
  const [industry, setIndustry] = useState<NonNullable<PortfolioFilters["industry"]>>("all");
  const [adoption, setAdoption] = useState<NonNullable<PortfolioFilters["adoption"]>>("all");
  const [trend, setTrend] = useState<NonNullable<PortfolioFilters["trend"]>>("all");
  const [sortBy, setSortBy] = useState<NonNullable<PortfolioFilters["sortBy"]>>("health");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filters = useMemo<PortfolioFilters>(
    () => ({ search, health, industry, adoption, trend, sortBy, sortDir }),
    [search, health, industry, adoption, trend, sortBy, sortDir],
  );

  const { data, isPending, error, refetch } = useQuery(tenantsQuery(filters));
  const filtersActive =
    search !== "" || health !== "all" || industry !== "all" || adoption !== "all" || trend !== "all";

  const reset = () => {
    setSearch("");
    setHealth("all");
    setIndustry("all");
    setAdoption("all");
    setTrend("all");
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Tenant Portfolio"
        description="Every Tenant, with engagement, adoption and health signals."
        actions={
          data ? (
            <span className="text-sm text-muted-foreground tabular">{data.length} Tenants</span>
          ) : null
        }
      />

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

        <FilterSelect
          label="Health"
          value={health}
          onChange={(v) => setHealth(v as typeof health)}
          options={[
            ["all", "All health"],
            ["Healthy", "Healthy"],
            ["Watch", "Watch"],
            ["At Risk", "At Risk"],
          ]}
        />
        <FilterSelect
          label="Industry"
          value={industry}
          onChange={(v) => setIndustry(v as typeof industry)}
          options={[["all", "All industries"], ...INDUSTRIES.map((i) => [i, i] as [string, string])]}
        />
        <FilterSelect
          label="Adoption"
          value={adoption}
          onChange={(v) => setAdoption(v as typeof adoption)}
          options={[
            ["all", "All adoption"],
            ["high", "High (≥70%)"],
            ["medium", "Medium (45–69%)"],
            ["low", "Low (<45%)"],
          ]}
        />
        <FilterSelect
          label="Trend"
          value={trend}
          onChange={(v) => setTrend(v as typeof trend)}
          options={[
            ["all", "All trends"],
            ["up", "Increasing"],
            ["flat", "Stable"],
            ["down", "Declining"],
          ]}
        />
        <FilterSelect
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
        {error ? (
          <div className="p-4">
            <ErrorState error={error as Error} onRetry={() => refetch()} />
          </div>
        ) : isPending ? (
          <LoadingBlock rows={8} className="p-4" />
        ) : data.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No Tenants match your filters"
              description="Try clearing the search or relaxing a filter."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Tenant</th>
                  <th className="px-4 py-2.5 font-semibold">Industry</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Employees</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Active users</th>
                  <th className="px-4 py-2.5 font-semibold">App adoption</th>
                  <th className="px-4 py-2.5 font-semibold">Health</th>
                  <th className="px-4 py-2.5 font-semibold">30-day trend</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Opps</th>
                  <th className="px-4 py-2.5 font-semibold">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.id} className="border-b border-border/70 last:border-0 hover:bg-surface-muted">
                    <td className="px-4 py-2.5">
                      <Link
                        to="/tenants/$tenantId"
                        params={{ tenantId: t.id }}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.industry}</td>
                    <td className="px-4 py-2.5 text-right tabular">{t.employees.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {t.monthlyActiveUsers.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <AdoptionBar value={t.appAdoption} />
                    </td>
                    <td className="px-4 py-2.5">
                      <HealthBadge category={t.health.category} score={t.health.score} />
                    </td>
                    <td className="px-4 py-2.5">
                      <TrendIndicator value={t.trendPct} direction={t.trend} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">{t.opportunities.length}</td>
                    <td className="px-4 py-2.5 text-muted-foreground tabular">{t.lastActivity}</td>
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

function FilterSelect({
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
      <SelectTrigger className="w-[168px]" aria-label={label}>
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
