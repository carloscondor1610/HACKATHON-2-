import { apiRequest } from "./http";
import type {
  Signal,
  SignalAttendableStatus,
  SignalsFeedQuery,
  SignalsFeedResponse,
  UpdateSignalStatusRequest,
} from "../types/signal.types";

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

export function getSignalsFeed(
  query: SignalsFeedQuery,
  signal?: AbortSignal
): Promise<SignalsFeedResponse> {
  const search = buildQuery({
    cursor: query.cursor,
    limit: query.limit,
    signalType: query.signalType,
    severity: query.severity,
    status: query.status,
    q: query.q,
  });

  return apiRequest<SignalsFeedResponse>(`/signals/feed${search}`, {
    signal,
  });
}

export function getSignalById(
  id: string,
  signal?: AbortSignal
): Promise<Signal> {
  return apiRequest<Signal>(`/signals/${encodeURIComponent(id)}`, {
    signal,
  });
}

export function updateSignalStatus(
  id: string,
  status: SignalAttendableStatus,
  signal?: AbortSignal
): Promise<Signal> {
  const body: UpdateSignalStatusRequest = { status };

  return apiRequest<Signal>(`/signals/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body,
    signal,
  });
}