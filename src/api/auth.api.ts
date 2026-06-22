import { apiRequest } from "./http";
import type { AuthUser, LoginRequest, LoginResponse } from "../types/api.types";

export function loginRequest(data: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: data,
    auth: false,
  });
}

export function meRequest(): Promise<AuthUser> {
  return apiRequest<AuthUser>("/auth/me");
}