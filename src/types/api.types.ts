export type UserRole = "OPERATOR";

export interface AuthUser {
  id: string;
  displayName: string;
  email: string;
  teamCode: string;
  role: UserRole;
}

export interface LoginRequest {
  teamCode: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export interface DashboardSummary {
  totalTropels: number;
  criticalTropels: number;
  openSignals: number;
  sectorStabilityAvg: number;
  signalsBySeverity: {
    LEVE: number;
    MODERADO: number;
    GRAVE: number;
    CRITICO: number;
  };
  generatedAt: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  path: string;
  details: Record<string, unknown>;
}