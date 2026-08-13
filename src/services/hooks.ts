import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { provider } from "./provider";
import type { OpportunityFilters, OpportunityStatus, PortfolioFilters } from "@/domain/types";

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

export const opportunitiesQuery = (filters: OpportunityFilters = {}) =>
  queryOptions({
    queryKey: ["opportunities", filters],
    queryFn: () => provider.listOpportunities(filters),
  });

export const opportunityQuery = (id: string) =>
  queryOptions({
    queryKey: ["opportunity", id],
    queryFn: () => provider.getOpportunity(id),
  });

export const adoptionIntelligenceQuery = () =>
  queryOptions({
    queryKey: ["adoption-intelligence"],
    queryFn: () => provider.getAdoptionIntelligence(),
  });

export const appAdoptionQuery = (appId: string) =>
  queryOptions({
    queryKey: ["app-adoption", appId],
    queryFn: () => provider.getAppAdoption(appId),
  });

/**
 * Service-level mutation boundary. The UI never talks to the provider
 * directly — it goes through this hook, mirroring the read-side query helpers.
 */
export function useSetOpportunityStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OpportunityStatus }) =>
      provider.setOpportunityStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
