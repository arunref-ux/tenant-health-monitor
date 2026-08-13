import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  Boxes,
  Building2,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  Radio,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Tenants", to: "/tenants", icon: Building2 },
  { label: "TTYB", to: "/ttyb", icon: Activity },
  { label: "Opportunities", to: "/opportunities", icon: Lightbulb },
  { label: "Adoption Intelligence", to: "/adoption", icon: Boxes },
];

const FUTURE = [
  { label: "Business Skills", icon: GraduationCap },
  { label: "Interventions", icon: Wrench },
  { label: "Event Monitor", icon: Radio },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex">
        <div className="px-2 pb-5">
          <p className="text-sm font-semibold tracking-tight text-sidebar-accent-foreground">
            Aurumi
          </p>
          <p className="text-xs text-sidebar-foreground/70">Tenant Success</p>
        </div>

        <nav className="space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
              }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="mt-6 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Coming later
        </p>
        <div className="mt-1 space-y-0.5">
          {FUTURE.map((item) => (
            <span
              key={item.label}
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/40"
            >
              <item.icon className="size-4" />
              <span className="flex-1">{item.label}</span>
              <span className="rounded border border-sidebar-border px-1 text-[10px] uppercase">
                soon
              </span>
            </span>
          ))}
        </div>

        <div className="mt-auto px-2.5 pt-6 text-[11px] leading-relaxed text-sidebar-foreground/50">
          Iteration 3 · simulated data
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3 lg:hidden">
          <div>
            <p className="text-sm font-semibold">Aurumi Tenant Success</p>
          </div>
          <nav className="flex gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground"
                activeProps={{ className: "bg-secondary text-foreground font-medium" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-surface", className)}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
