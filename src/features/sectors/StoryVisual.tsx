import type { StoryStage } from "../../api/sectors.api";

interface Props {
  stage: StoryStage;
  activeStage: number;
  totalStages: number;
}

export function StoryVisual({
  stage,
  activeStage,
  totalStages,
}: Props) {
  const progress =
    ((activeStage + 1) / totalStages) * 100;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
      <p className="text-sm uppercase tracking-widest text-cyan-300">
        Story Engine
      </p>

      <h2 className="mt-3 text-3xl font-bold text-cyan-300">
        {stage.title}
      </h2>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Metric
          label="Stability"
          value={stage.metrics.stability}
        />

        <Metric
          label="Energy"
          value={stage.metrics.energy}
        />

        <Metric
          label="Alerts"
          value={stage.metrics.alerts}
        />
      </div>

      <div className="mt-6 rounded-xl bg-slate-800 p-4">
        <p className="text-sm text-slate-300">
          Event:
          <span className="ml-2 font-semibold text-white">
            {stage.dominantEvent}
          </span>
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Asset: {stage.assetKey}
        </p>
      </div>

      <div className="mt-8">
        <div className="flex justify-between text-sm text-slate-400">
          <span>
            Etapa {activeStage + 1}
          </span>

          <span>
            {totalStages}
          </span>
        </div>

        <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-4 rounded-full bg-cyan-400 transition-all duration-500"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-800 p-4 text-center">
      <p className="text-xs uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}