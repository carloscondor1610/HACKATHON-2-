export const SPECIES_OPTIONS = [
  "BLOBITO",
  "CHISPA",
  "GRUNON",
  "DORMILON",
  "GLITCHY",
] as const;

export const VITAL_STATE_OPTIONS = [
  "ESTABLE",
  "HAMBRIENTO",
  "AGITADO",
  "MUTANDO",
  "CRITICO",
] as const;

export const TROPEL_SORT_OPTIONS = [
  "name,asc",
  "updatedAt,desc",
  "chaosIndex,desc",
] as const;

export type Species = (typeof SPECIES_OPTIONS)[number];
export type VitalState = (typeof VITAL_STATE_OPTIONS)[number];
export type TropelSort = (typeof TROPEL_SORT_OPTIONS)[number];

export interface SectorSummary {
  id: string;
  sectorCode: string;
  name: string;
  climate: string;
  capacity: number;
  currentLoad: number;
  stabilityLevel: number;
}

export interface SectorsResponse {
  items: SectorSummary[];
}

export interface TropelSector {
  id: string;
  name: string;
  sectorCode: string;
}

export interface Tropel {
  id: string;
  name: string;
  species: Species;
  vitalState: VitalState;
  energyLevel: number;
  chaosIndex: number;
  mutationStage: number;
  guardianName: string;
  sector: TropelSector;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedTropelsResponse {
  content: Tropel[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
}

export interface TropelsQuery {
  page: number;
  size: 10 | 20 | 50;
  species?: Species;
  vitalState?: VitalState;
  sectorId?: string;
  q?: string;
  sort: TropelSort;
}