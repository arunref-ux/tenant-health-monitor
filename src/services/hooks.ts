import { queryOptions } from "@tanstack/react-query";
import { provider } from "./provider";
import type { PortfolioFilters } from "@/domain/types";

export const overviewQuery = () =>
  queryOptions({
    queryKey: ["overview"],
    queryFn: () => provider.getOverview(),
  });

export const tenantsQuery = (filters: PortfolioFilters = {}) =>
  queryOptions({
    queryKey: ["tenants", filters],
    queryFn: () => provider.listTenants(filters),
  });

export const tenantQuery = (id: string) =>
  queryOptions({
    queryKey: ["tenant", id],
    queryFn: () => provider.getTenant(id),
  });
