import { apiRequest } from "./http";
import type { DashboardSummary } from "../types/api.types";

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>("/dashboard/summary");
}