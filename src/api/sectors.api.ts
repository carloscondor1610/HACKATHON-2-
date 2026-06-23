import { apiRequest } from "./http";
import type { SectorsResponse } from "../types/tropel.types";

export function getSectors(signal?: AbortSignal): Promise<SectorsResponse> {
  return apiRequest<SectorsResponse>("/sectors", {
    signal,
  });
}