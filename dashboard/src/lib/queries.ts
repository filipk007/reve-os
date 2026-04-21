/**
 * Typed TanStack Query hooks wrapping api.ts functions.
 *
 * Pattern: one `queryKeys` entry per resource (for cache invalidation),
 * one `useX()` hook per fetcher, one `useXMutation()` per mutator.
 *
 * Adding a new query:
 *   1. Add a key to `queryKeys` (array form — first element is the resource name).
 *   2. Export a `useX()` hook calling `useQuery({ queryKey, queryFn })`.
 *   3. For writes, export `useXMutation()` and invalidate relevant keys in `onSuccess`.
 *
 * Migration: pages can adopt these incrementally — old `useEffect + fetch`
 * code continues to work side-by-side.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

import * as api from "./api";
import type {
  ClientProfile,
  ClientSummary,
  Destination,
  Experiment,
  FunctionDefinition,
  HealthResponse,
  Job,
  JobListItem,
  KnowledgeBaseFile,
  PipelineDefinition,
  PlayDefinition,
  Stats,
  TableSummary,
  UsageHealth,
  UsageSummary,
} from "./types";

// --------------------------------------------------------------- Query keys

export const queryKeys = {
  health: ["health"] as const,
  healthDeep: ["health", "deep"] as const,
  stats: ["stats"] as const,
  jobs: ["jobs"] as const,
  job: (id: string) => ["jobs", id] as const,
  skills: ["skills"] as const,

  clients: ["clients"] as const,
  client: (slug: string) => ["clients", slug] as const,

  destinations: ["destinations"] as const,

  knowledgeBase: ["knowledge-base"] as const,
  knowledgeFile: (path: string) => ["knowledge-base", path] as const,

  pipelines: ["pipelines"] as const,
  pipeline: (name: string) => ["pipelines", name] as const,

  plays: (category?: string) =>
    category ? (["plays", category] as const) : (["plays"] as const),
  play: (name: string) => ["plays", name] as const,

  experiments: ["experiments"] as const,
  experiment: (id: string) => ["experiments", id] as const,

  functions: ["functions"] as const,
  function: (id: string) => ["functions", id] as const,

  tables: ["tables"] as const,

  usage: ["usage"] as const,
  usageHealth: ["usage", "health"] as const,
} as const;

// ---------------------------------------------------------------- Core hooks

export function useHealth(
  options?: Partial<UseQueryOptions<HealthResponse>>,
) {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: api.fetchHealth,
    refetchInterval: 30_000,
    ...options,
  });
}

export function useStats(options?: Partial<UseQueryOptions<Stats>>) {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: api.fetchStats,
    refetchInterval: 15_000,
    ...options,
  });
}

export function useJobs(
  options?: Partial<
    UseQueryOptions<{ pending: number; total: number; jobs: JobListItem[] }>
  >,
) {
  return useQuery({
    queryKey: queryKeys.jobs,
    queryFn: api.fetchJobs,
    refetchInterval: 5_000,
    ...options,
  });
}

export function useJob(id: string, options?: Partial<UseQueryOptions<Job>>) {
  return useQuery({
    queryKey: queryKeys.job(id),
    queryFn: () => api.fetchJob(id),
    enabled: !!id,
    ...options,
  });
}

export function useSkills() {
  return useQuery({
    queryKey: queryKeys.skills,
    queryFn: api.fetchSkills,
    staleTime: 5 * 60_000,
  });
}

// ----------------------------------------------------------------- Clients

export function useClients(
  options?: Partial<UseQueryOptions<{ clients: ClientSummary[] }>>,
) {
  return useQuery({
    queryKey: queryKeys.clients,
    queryFn: api.fetchClients,
    staleTime: 60_000,
    ...options,
  });
}

export function useClient(
  slug: string,
  options?: Partial<UseQueryOptions<ClientProfile>>,
) {
  return useQuery({
    queryKey: queryKeys.client(slug),
    queryFn: () => api.fetchClient(slug),
    enabled: !!slug,
    staleTime: 60_000,
    ...options,
  });
}

export function useCreateClientMutation(
  options?: UseMutationOptions<ClientProfile, Error, { slug: string; name: string }>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      api.createClient(body as unknown as Parameters<typeof api.createClient>[0]),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.clients });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useDeleteClientMutation(
  options?: UseMutationOptions<{ ok: boolean }, Error, string>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug) => api.deleteClient(slug),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.clients });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

// ------------------------------------------------------------ Destinations

export function useDestinations() {
  return useQuery({
    queryKey: queryKeys.destinations,
    queryFn: api.fetchDestinations,
  });
}

export function useDeleteDestinationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDestination(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.destinations }),
  });
}

// ---------------------------------------------------------- Knowledge base

export function useKnowledgeBase() {
  return useQuery({
    queryKey: queryKeys.knowledgeBase,
    queryFn: api.fetchKnowledgeBase,
    staleTime: 60_000,
  });
}

export function useKnowledgeFile(path: string) {
  const [category, ...rest] = path.split("/");
  const filename = rest.join("/");
  return useQuery({
    queryKey: queryKeys.knowledgeFile(path),
    queryFn: () => api.fetchKnowledgeFile(category, filename),
    enabled: !!path && !!category && !!filename,
  });
}

// --------------------------------------------------------------- Pipelines

export function usePipelines() {
  return useQuery({
    queryKey: queryKeys.pipelines,
    queryFn: api.fetchPipelines,
  });
}

export function usePipeline(name: string) {
  return useQuery({
    queryKey: queryKeys.pipeline(name),
    queryFn: () => api.fetchPipeline(name),
    enabled: !!name,
  });
}

// ------------------------------------------------------------------- Plays

export function usePlays(category?: string) {
  return useQuery({
    queryKey: queryKeys.plays(category),
    queryFn: () => api.fetchPlays(category),
  });
}

export function usePlay(name: string) {
  return useQuery({
    queryKey: queryKeys.play(name),
    queryFn: () => api.fetchPlay(name),
    enabled: !!name,
  });
}

// ------------------------------------------------------------- Experiments

export function useExperiments() {
  return useQuery({
    queryKey: queryKeys.experiments,
    queryFn: api.fetchExperiments,
  });
}

export function useExperiment(id: string) {
  return useQuery({
    queryKey: queryKeys.experiment(id),
    queryFn: () => api.getExperiment(id),
    enabled: !!id,
  });
}

// --------------------------------------------------------------- Functions

export function useFunctions(params?: Parameters<typeof api.fetchFunctions>[0]) {
  return useQuery({
    queryKey: [...queryKeys.functions, params ?? {}] as const,
    queryFn: () => api.fetchFunctions(params),
    staleTime: 30_000,
  });
}

export function useFunction(id: string) {
  return useQuery({
    queryKey: queryKeys.function(id),
    queryFn: () => api.fetchFunction(id),
    enabled: !!id,
  });
}

export function useDeleteFunctionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteFunction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.functions }),
  });
}

// ------------------------------------------------------------------ Tables

export function useTables(
  options?: Partial<UseQueryOptions<{ tables: TableSummary[] }>>,
) {
  return useQuery({
    queryKey: queryKeys.tables,
    queryFn: api.fetchTables,
    ...options,
  });
}

// ------------------------------------------------------------------- Usage

export function useUsage(options?: Partial<UseQueryOptions<UsageSummary>>) {
  return useQuery({
    queryKey: queryKeys.usage,
    queryFn: api.fetchUsage,
    refetchInterval: 30_000,
    ...options,
  });
}

export function useUsageHealth(options?: Partial<UseQueryOptions<UsageHealth>>) {
  return useQuery({
    queryKey: queryKeys.usageHealth,
    queryFn: api.fetchUsageHealth,
    refetchInterval: 30_000,
    ...options,
  });
}

// ----------------------------------------------------- Type re-exports (DX)

export type {
  ClientProfile,
  ClientSummary,
  Destination,
  Experiment,
  FunctionDefinition,
  HealthResponse,
  Job,
  JobListItem,
  KnowledgeBaseFile,
  PipelineDefinition,
  PlayDefinition,
  Stats,
  TableSummary,
  UsageHealth,
  UsageSummary,
};
