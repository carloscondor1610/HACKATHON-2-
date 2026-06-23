import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getSectorStory,
  type SectorStoryResponse,
} from "../api/sectors.api";

import { useActiveStage } from "../features/sectors/useActiveStage";
import { StoryVisual } from "../features/sectors/StoryVisual";

export function SectorStoryPage() {
  const { id } = useParams();

  const [story, setStory] =
    useState<SectorStoryResponse | null>(null);

  useEffect(() => {
    if (!id) return;

    getSectorStory(id).then(setStory);
  }, [id]);

  const activeStage = useActiveStage(
    story?.stages.length ?? 0
  );

  if (!story) {
    return (
      <div className="py-20 text-center text-slate-300">
        Cargando historia...
      </div>
    );
  }

  const current =
    story.stages[activeStage] ?? story.stages[0];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-white">
          {story.sector.name}
        </h1>

        <p className="mt-2 text-slate-400">
          Clima: {story.sector.climate}
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_420px]">
        {/* PANEL IZQUIERDO */}
        <div>
          {story.stages.map((stage, index) => {
            const isActive = index === activeStage;

            return (
              <section
                key={stage.id}
                data-story-stage
                data-index={index}
                tabIndex={0}
                className={`min-h-screen border-l-4 pl-8 transition-all duration-500 ${
                  isActive
                    ? "border-cyan-400 opacity-100"
                    : "border-slate-700 opacity-50"
                }`}
              >
                <div className="sticky top-24">
                  <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
                    Etapa {index + 1}
                  </p>

                  <h2 className="mt-4 text-5xl font-bold text-white">
                    {stage.title}
                  </h2>

                  <p className="mt-8 max-w-2xl text-xl leading-relaxed text-slate-300">
                    {stage.narrative}
                  </p>
                </div>
              </section>
            );
          })}
        </div>

        {/* PANEL DERECHO */}
        <div className="relative">
          <div className="sticky top-24">
            <StoryVisual
              stage={current}
              activeStage={activeStage}
              totalStages={story.stages.length}
            />
          </div>
        </div>
      </div>
    </div>
  );
}