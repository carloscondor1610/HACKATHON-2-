import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { HttpError } from "../api/http";
import { getSignalById, updateSignalStatus } from "../api/signals.api";
import {
  SIGNAL_ATTENDABLE_STATUS_OPTIONS,
  type Signal,
  type SignalAttendableStatus,
} from "../types/signal.types";
import { saveSignalStatusCache } from "../utils/signalsCache";

interface LocationState {
  fromFeed?: string;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function getStatusClass(status: string): string {
  if (status === "ATENDIDA") {
    return "border-green-400/40 bg-green-500/10 text-green-200";
  }

  if (status === "PROCESANDO") {
    return "border-yellow-400/40 bg-yellow-500/10 text-yellow-100";
  }

  return "border-slate-600 bg-slate-800 text-slate-200";
}

function getHttpMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpError) {
    return error.message;
  }

  return fallback;
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

  const [updatingStatus, setUpdatingStatus] =
    useState<SignalAttendableStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [failedStatus, setFailedStatus] =
    useState<SignalAttendableStatus | null>(null);

  const actionControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!id) {
      setError("ID de Senal invalido.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    setIsLoading(true);
    setError(null);
    setActionError(null);
    setActionSuccess(null);
    setFailedStatus(null);

    void getSignalById(id, controller.signal)
      .then((data) => {
        setSignal(data);
      })
      .catch((caughtError: unknown) => {
        if (isAbortError(caughtError)) {
          return;
        }

        setError(
          getHttpMessage(caughtError, "No se pudo cargar el detalle de la Senal.")
        );
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      controller.abort();
      actionControllerRef.current?.abort();
    };
  }, [id]);

  async function handleStatusChange(nextStatus: SignalAttendableStatus) {
    if (!id || updatingStatus || !signal) {
      return;
    }

    const controller = new AbortController();
    actionControllerRef.current = controller;

    setUpdatingStatus(nextStatus);
    setActionError(null);
    setActionSuccess(null);
    setFailedStatus(null);

    try {
      const updatedSignal = await updateSignalStatus(
        id,
        nextStatus,
        controller.signal
      );

      setSignal(updatedSignal);
      saveSignalStatusCache(updatedSignal);
      setActionSuccess(`Estado actualizado a ${updatedSignal.status}.`);
    } catch (caughtError: unknown) {
      if (isAbortError(caughtError)) {
        return;
      }

      setFailedStatus(nextStatus);
      setActionError(
        getHttpMessage(
          caughtError,
          "No se pudo actualizar el estado. El estado anterior se conserva."
        )
      );
    } finally {
      if (actionControllerRef.current === controller) {
        actionControllerRef.current = null;
      }

      setUpdatingStatus(null);
    }
  }

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

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-red-400 px-4 py-2 font-semibold text-slate-950 hover:bg-red-300"
          >
            Reintentar
          </button>

          <button
            onClick={() => navigate(backTo)}
            className="rounded-lg border border-slate-700 px-4 py-2 font-semibold text-slate-100 hover:bg-slate-800"
          >
            Volver al feed
          </button>
        </div>
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

          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
              signal.status
            )}`}
          >
            {signal.status}
          </span>
        </div>

        <p className="mt-6 text-lg text-slate-200">{signal.rawContent}</p>

        <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <h2 className="text-lg font-bold text-white">Atender Senal</h2>
          <p className="mt-1 text-sm text-slate-400">
            Cambia el estado usando el backend real. La accion queda bloqueada
            mientras la request esta en vuelo.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {SIGNAL_ATTENDABLE_STATUS_OPTIONS.map((status) => {
              const isSameStatus = signal.status === status;
              const isCurrentAction = updatingStatus === status;

              return (
                <button
                  key={status}
                  type="button"
                  disabled={updatingStatus !== null || isSameStatus}
                  onClick={() => void handleStatusChange(status)}
                  className="rounded-lg bg-cyan-400 px-4 py-2 font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {isCurrentAction ? "Actualizando..." : `Marcar ${status}`}
                </button>
              );
            })}
          </div>

          {actionSuccess && (
            <p className="mt-4 rounded-lg border border-green-400/40 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-200">
              {actionSuccess}
            </p>
          )}

          {actionError && (
            <div className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-red-100">{actionError}</p>
              <p className="mt-1 text-sm text-red-200">
                El estado anterior sigue siendo {signal.status}.
              </p>

              {failedStatus && (
                <button
                  type="button"
                  disabled={updatingStatus !== null}
                  onClick={() => void handleStatusChange(failedStatus)}
                  className="mt-3 rounded-lg bg-red-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-red-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  Reintentar marcar {failedStatus}
                </button>
              )}
            </div>
          )}
        </div>

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