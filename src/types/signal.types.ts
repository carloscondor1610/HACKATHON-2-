export const SIGNAL_TYPE_OPTIONS = [
  "HAMBRE",
  "ABANDONO",
  "MUTACION",
  "FUGA",
  "CONFLICTO",
  "REPRODUCCION_MASIVA",
  "SENAL_CORRUPTA",
] as const;

export const SEVERITY_OPTIONS = ["LEVE", "MODERADO", "GRAVE", "CRITICO"] as const;

export const SIGNAL_STATUS_OPTIONS = [
  "RECIBIDA",
  "PROCESANDO",
  "ATENDIDA",
] as const;

export type SignalType = (typeof SIGNAL_TYPE_OPTIONS)[number];
export type Severity = (typeof SEVERITY_OPTIONS)[number];
export type SignalStatus = (typeof SIGNAL_STATUS_OPTIONS)[number];

export type SignalSpecies =
  | "BLOBITO"
  | "CHISPA"
  | "GRUNON"
  | "DORMILON"
  | "GLITCHY";

export interface SignalTropel {
  id: string;
  name: string;
  species: SignalSpecies;
}

export interface Signal {
  id: string;
  signalType: SignalType;
  severity: Severity;
  status: SignalStatus;
  rawContent: string;
  tropel: SignalTropel;
  createdAt: string;
  updatedAt: string;
}

export interface SignalsFeedQuery {
  cursor?: string;
  limit: 15 | 30;
  signalType?: SignalType;
  severity?: Severity;
  status?: SignalStatus;
  q?: string;
}

export interface SignalsFeedResponse {
  items: Signal[];
  nextCursor: string | null;
  hasMore: boolean;
  totalEstimate: number;
}