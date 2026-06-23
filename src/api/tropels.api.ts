import { apiRequest } from "./http";
import type {
  PaginatedTropelsResponse,
  TropelsQuery,
} from "../types/tropel.types";

type QueryValue = string | number | null | undefined;

function buildQuery(params: Record<string, QueryValue>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function getTropels(
  query: TropelsQuery,
  signal?: AbortSignal
): Promise<PaginatedTropelsResponse> {
  const search = buildQuery({
    page: query.page,
    size: query.size,
    species: query.species,
    vitalState: query.vitalState,
    sectorId: query.sectorId,
    q: query.q,
    sort: query.sort,
  });

  return apiRequest<PaginatedTropelsResponse>(`/tropels${search}`, {
    signal,
  });
}