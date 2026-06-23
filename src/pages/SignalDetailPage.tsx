import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { HttpError } from "../api/http";
import { getSignalById } from "../api/signals.api";
import type { Signal } from "../types/signal.types";

interface LocationState {
  fromFeed?: string;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function SignalDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as LocationState | null;
  const backTo = state?.fromFeed ?? "/signals";

  const [signal, setSignal] = useState<Signal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("ID de Senal invalido.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    getSignalById(id, controller.signal)
      .then((data) => {
        setSignal(data);
      })
      .catch((caughtError) => {
        if (isAbortError(caughtError)) {
          return;
        }

        if (caughtError instanceof HttpError) {
          setError(caughtError.message);
        } else {
          setError("No se pudo cargar el detalle de la Senal.");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [id]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-slate-300">Cargando detalle de la Senal...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-400/40 bg-red-500/10 p-8">
        <h1 className="text-2xl font-bold text-red-100">
          Error al cargar la Senal
        </h1>

        <p className="mt-2 text-red-200">{error}</p>

        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-red-400 px-4 py-2 font-semibold text-slate-950 hover:bg-red-300"
        >
          Reintentar
        </button>
      </section>
    );
  }

  if (!signal) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-bold text-white">Senal no encontrada</h1>

        <p className="mt-2 text-slate-400">
          No existe informacion para esta Senal.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(backTo)}
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
      >
        Volver al feed
      </button>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
          Senal
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          {signal.signalType}
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          ID: <span className="text-slate-200">{signal.id}</span>
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-yellow-400/40 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-100">
            {signal.severity}
          </span>

          <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
            {signal.status}
          </span>
        </div>

        <p className="mt-6 text-lg text-slate-200">{signal.rawContent}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Tropel</p>
            <p className="mt-2 font-bold text-white">{signal.tropel.name}</p>
            <p className="text-sm text-cyan-300">{signal.tropel.species}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Creada</p>
            <p className="mt-2 font-bold text-white">
              {new Date(signal.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Actualizada</p>
            <p className="mt-2 font-bold text-white">
              {new Date(signal.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}