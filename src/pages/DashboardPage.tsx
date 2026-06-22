import { useEffect, useState } from "react";
import { getDashboardSummary } from "../api/dashboard.api";
import { HttpError } from "../api/http";
import type { DashboardSummary } from "../types/api.types";

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (caughtError) {
      if (caughtError instanceof HttpError) {
        setError(caughtError.message);
      } else {
        setError("No se pudo cargar el dashboard.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-slate-300">Cargando indicadores...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-400/40 bg-red-500/10 p-8">
        <h1 className="text-2xl font-bold text-red-200">Error al cargar</h1>
        <p className="mt-2 text-red-100">{error}</p>

        <button
          onClick={loadDashboard}
          className="mt-4 rounded-lg bg-red-400 px-4 py-2 font-semibold text-slate-950"
        >
          Reintentar
        </button>
      </section>
    );
  }

  if (!summary) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold text-white">Sin datos</h1>
        <p className="mt-2 text-slate-400">
          No hay informacion disponible para este workspace.
        </p>
      </section>
    );
  }

  const cards = [
    { label: "Tropeles totales", value: summary.totalTropels },
    { label: "Tropeles criticos", value: summary.criticalTropels },
    { label: "Senales abiertas", value: summary.openSignals },
    { label: "Estabilidad promedio", value: `${summary.sectorStabilityAvg}%` },
  ];

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
          Dashboard
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Estado general de la colonia
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Generado en: {new Date(summary.generatedAt).toLocaleString()}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-bold text-cyan-300">
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-bold text-white">Senales por severidad</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Object.entries(summary.signalsBySeverity).map(([severity, count]) => (
            <div
              key={severity}
              className="rounded-xl border border-slate-800 bg-slate-950 p-4"
            >
              <p className="text-sm text-slate-400">{severity}</p>
              <p className="mt-2 text-2xl font-bold text-white">{count}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}