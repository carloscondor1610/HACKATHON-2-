import { apiRequest } from "./http";

export interface Sector {
  id: string;
  sectorCode: string;
  name: string;
  climate: string;
  capacity: number;
  currentLoad: number;
  stabilityLevel: number;
}

export interface StoryStage {
  id: string;
  order: number;
  title: string;
  narrative: string;
  dominantEvent: string;
  metrics: {
    stability: number;
    energy: number;
    alerts: number;
  };
  assetKey: string;
  colorToken: string;
  progress: number;
}

export interface SectorStoryResponse {
  sector: {
    id: string;
    name: string;
    climate: string;
  };
  stages: StoryStage[];
}

export async function getSectors() {
  return apiRequest<{ items: Sector[] }>("/sectors");
}

export async function getSectorStory(id: string) {
  return apiRequest<SectorStoryResponse>(`/sectors/${id}/story`);
}