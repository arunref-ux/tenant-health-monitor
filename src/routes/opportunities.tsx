import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2, Flame, Lightbulb, Search } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ts/AppShell";
import { KpiCard } from "@/components/ts/KpiCard";
import {
  HealthBadge,
  LensChip,
  OpportunityStatusBadge,
  PriorityBadge,
} from "@/components/ts/StatusBadge";
import { TrendIndicator } from "@/components/ts/TrendIndicator";
import { EmptyState, ErrorState, KpiSkeleton, LoadingBlock } from "@/components/ts/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { opportunitiesQuery, tenantsQuery, useSetOpportunityStatus } from "@/services/hooks";
import type {
  Opportunity,
  OpportunityFilters,
  OpportunityLens,
  OpportunitySeverity,
  OpportunityStatus,
  OpportunityType,
} from "@/domain/types";

interface OpportunitySearch {
  id?: string | undefined;
  type?: OpportunityType | undefined;
  tenantId?: string | undefined;
  appId?: string | undefined;
}

const TYPES: OpportunityType[] = [
  "Activation Gap",
  "Engagement Gap",
  "App Adoption Gap",
  "Usage Decline",
  "TTYB Adoption",
  "Cross-App Adoption",
];
const SEVERITIES: OpportunitySeverity[] = ["High", "Medium", "Low"];
const STATUSES: OpportunityStatus[] = ["Open", "Dismissed"];
const LENSES: OpportunityLens[] = ["Tenant", "Aurumi", "Portfolio"];

export const Route = createFileRoute("/opportunities")({
  validateSearch: (search: Record<string, unknown>): OpportunitySearch => ({
    id: typeof search["id"] === "string" ? (search["id"] as string) : undefined,
    type: TYPES.includes(search["type"] as OpportunityType)
      ? (search["type"] as OpportunityType)
      : undefined,
    tenantId: typeof search["tenantId"] === "string" ? (search["tenantId"] as string) : undefined,
    appId: typeof search["appId"] === "string" ? (search["appId"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Opportunities — Aurumi Tenant Success" },
      {
        name: "description",
        content:
          "Every detected Tenant Success opportunity with evidence, severity, trend and drilldown into the affected Aurumi Tenant.",
      },
      { property: "og:title", content: "Opportunities — Aurumi Tenant Success" },
      {
        property: "og:description",
        content: "Detected opportunities with evidence, severity and Tenant drilldown.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OpportunitiesPage,
});

const pct = (v: number) => `${Math.round(v * 100)}%`;

function OpportunitiesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  const [text, setText] = useState("");
  const [severity, setSeverity] = useState<OpportunitySeverity | "all">("all");
  const [status, setStatus] = useState<OpportunityStatus | "all">("Open");
  const [lens, setLens] = useState<OpportunityLens | "all">("all");
  const [sortBy, setSortBy] = useState<NonNullable<OpportunityFilters["sortBy"]>>("priority");

  const type = search.type ?? "all";
  const tenantId = search.tenantId ?? "all";

  const filters = useMemo<OpportunityFilters>(
    () => ({
      search: text,
      type,
      severity,
      status,
      lens,
      tenantId,
      ...(search.appId ? { appId: search.appId } : {}),
      sortBy,
      sortDir: "desc",
    }),
    [text, type, severity, status, lens, tenantId, search.appId, sortBy],
  );

  const { data, isPending, error, refetch } = useQuery(opportunitiesQuery(filters));
  const allOpen = useQuery(opportunitiesQuery({ status: "Open" }));
  const tenants = useQuery(tenantsQuery({ sortBy: "name", sortDir: "asc" }));

  const setStatusMutation = useSetOpportunityStatus();

  const selected = data?.find((o) => o.id === search.id);
  const open = allOpen.data ?? [];
  const summary = {
    open: open.length,
    high: open.filter((o) => o.severity === "High").length,
    tenants: new Set(open.map((o) => o.tenantId)).size,
    trending: open.filter((o) => o.trend === "down").length,
  };

  const resetFilters = () => {
    setText("");
    setSeverity("all");
    setStatus("Open");
    setLens("all");
    void navigate({ search: {} });
  };

  const filtersActive =
    text !== "" ||
    severity !== "all" ||
    status !== "Open" ||
    lens !== "all" ||
    type !== "all" ||
    tenantId !== "all" ||
    Boolean(search.appId);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Opportunities"
        description="Every observation detected from Tenant usage — with the evidence behind it, ranked by where attention is most warranted."
      />

      {allOpen.isPending ? (
        <KpiSkeleton count={4} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Open opportunities"
            value={summary.open}
            icon={<Lightbulb className="size-4" />}
          />
          <KpiCard
            label="High priority"
            value={summary.high}
            tone="danger"
            icon={<Flame className="size-4" />}
            hint="Severity High, status Open"
          />
          <KpiCard
            label="Tenants affected"
            value={summary.tenants}
            icon={<Building2 className="size-4" />}
          />
          <KpiCard
            label="Trending worse"
            value={summary.trending}
            tone="warning"
            icon={<AlertTriangle className="size-4" />}
            hint="Underlying metric declining over 30 days"
          />
        </div>
      )}

      <SectionCard
        title="Detected opportunities"
        description="Click an opportunity for the full evidence and Tenant drilldown."
        bodyClassName="p-0"
        action={
          filtersActive ? (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset filters
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search opportunities or Tenants"
              className="pl-8"
            />
          </div>

          <FilterSelect
            value={type}
            onChange={(v) => navigate({ search: (s) => ({ ...s, type: v === "all" ? undefined : (v as OpportunityType) }) })}
            placeholder="Type"
            options={TYPES}
            allLabel="All types"
          />
          <FilterSelect
            value={severity}
            onChange={(v) => setSeverity(v as OpportunitySeverity | "all")}
            placeholder="Severity"
            options={SEVERITIES}
            allLabel="All severities"
          />
          <FilterSelect
            value={status}
            onChange={(v) => setStatus(v as OpportunityStatus | "all")}
            placeholder="Status"
            options={STATUSES}
            allLabel="All statuses"
          />
          <FilterSelect
            value={lens}
            onChange={(v) => setLens(v as OpportunityLens | "all")}
            placeholder="Lens"
            options={LENSES}
            allLabel="All lenses"
          />
          <Select
            value={tenantId}
            onValueChange={(v) =>
              navigate({ search: (s) => ({ ...s, tenantId: v === "all" ? undefined : v }) })
            }
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Tenant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {(tenants.data ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="severity">Severity</SelectItem>
              <SelectItem value="affectedUsers">Affected users</SelectItem>
              <SelectItem value="tenant">Tenant</SelectItem>
              <SelectItem value="type">Type</SelectItem>
              <SelectItem value="detected">Detected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <div className="p-4">
            <ErrorState error={error as Error} onRetry={() => refetch()} />
          </div>
        ) : isPending || !data ? (
          <div className="p-4">
            <LoadingBlock rows={8} />
          </div>
        ) : data.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No opportunities match these filters"
              description="Adjust the filters to widen the search."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Opportunity</th>
                  <th className="px-4 py-2 font-semibold">Tenant</th>
                  <th className="px-4 py-2 font-semibold">Type</th>
                  <th className="px-4 py-2 font-semibold">Severity</th>
                  <th className="px-4 py-2 font-semibold">Evidence</th>
                  <th className="px-4 py-2 font-semibold">Trend</th>
                  <th className="px-4 py-2 font-semibold">Detected</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate({ search: (s) => ({ ...s, id: o.id }) })}
                    className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-surface-muted"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{o.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Priority score {o.priorityScore} · {o.affectedUsers.toLocaleString()} users
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        to="/tenants/$tenantId"
                        params={{ tenantId: o.tenantId }}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {o.tenantName}
                      </Link>
                      <div className="mt-0.5">
                        <HealthBadge category={o.healthCategory} score={o.healthScore} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{o.type}</td>
                    <td className="px-4 py-2.5">
                      <PriorityBadge priority={o.severity} />
                    </td>
                    <td className="max-w-[320px] px-4 py-2.5 text-muted-foreground">
                      {o.description}
                    </td>
                    <td className="px-4 py-2.5">
                      <TrendIndicator value={o.trendPct} direction={o.trend} />
                    </td>
                    <td className="px-4 py-2.5 tabular text-muted-foreground">{o.detectedAt}</td>
                    <td className="px-4 py-2.5">
                      <OpportunityStatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(next) => {
          if (!next) void navigate({ search: (s) => ({ ...s, id: undefined }) });
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
              </SheetHeader>
              <OpportunityDetail
                opportunity={selected}
                busy={setStatusMutation.isPending}
                onStatus={(next) => setStatusMutation.mutate({ id: selected.id, next })}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  allLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: readonly string[];
  allLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function OpportunityDetail({
  opportunity,
  busy,
  onStatus,
}: {
  opportunity: Opportunity;
  busy?: boolean;
  onStatus: (status: OpportunityStatus) => void;
}) {
  return (
    <div className="mt-4 space-y-5 px-4 pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge priority={opportunity.severity} />
        <OpportunityStatusBadge status={opportunity.status} />
        <LensChip lens={opportunity.lens} />
        <span className="text-xs text-muted-foreground">
          {opportunity.type} · detected {opportunity.detectedAt}
        </span>
      </div>

      <DetailBlock title="What we observed">
        <p className="text-sm text-muted-foreground">{opportunity.description}</p>
      </DetailBlock>

      <DetailBlock title="Evidence">
        <dl className="space-y-2">
          {opportunity.evidence.map((e) => (
            <div key={e.label} className="flex items-start justify-between gap-3 text-sm">
              <dt className="text-muted-foreground">
                {e.label}
                {e.detail && <span className="block text-xs opacity-80">{e.detail}</span>}
              </dt>
              <dd className="tabular font-medium text-foreground">{e.value}</dd>
            </div>
          ))}
        </dl>
      </DetailBlock>

      <DetailBlock title="Why it matters">
        <p className="text-sm text-muted-foreground">{opportunity.whyItMatters}</p>
      </DetailBlock>

      <DetailBlock title="Tenant">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link
              to="/tenants/$tenantId"
              params={{ tenantId: opportunity.tenantId }}
              className="text-sm font-medium text-primary hover:underline"
            >
              {opportunity.tenantName} — open Tenant 360 →
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              Health is context only; it does not change this observation.
            </p>
          </div>
          <HealthBadge category={opportunity.healthCategory} score={opportunity.healthScore} />
        </div>
      </DetailBlock>

      {opportunity.appNames.length > 0 && (
        <DetailBlock title="Related apps">
          <div className="flex flex-wrap gap-2">
            {opportunity.appNames.map((name, i) => (
              <Link
                key={name}
                to="/adoption"
                search={{ app: opportunity.appIds[i] ?? undefined }}
                className="rounded border border-border bg-surface-muted px-2 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary"
              >
                {name}
              </Link>
            ))}
          </div>
        </DetailBlock>
      )}

      <DetailBlock title="Trend">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendIndicator value={opportunity.trendPct} direction={opportunity.trend} />
          <span>over the last 30 days · {opportunity.affectedUsers.toLocaleString()} users affected</span>
        </div>
      </DetailBlock>

      <DetailBlock title="Status">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={opportunity.status === "Open" ? "default" : "outline"}
            disabled={busy}
            onClick={() => onStatus("Open")}
          >
            Open
          </Button>
          <Button
            size="sm"
            variant={opportunity.status === "Dismissed" ? "default" : "outline"}
            disabled={busy}
            onClick={() => onStatus("Dismissed")}
          >
            Dismissed
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Iteration 3 stops at the opportunity — no owners, tasks or interventions yet.
        </p>
      </DetailBlock>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

export { pct };
