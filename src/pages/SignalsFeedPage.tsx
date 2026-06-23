import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HttpError } from "../api/http";
import { getSignalsFeed } from "../api/signals.api";
import {
  SEVERITY_OPTIONS,
  SIGNAL_STATUS_OPTIONS,
  SIGNAL_TYPE_OPTIONS,
  type Severity,
  type Signal,
  type SignalStatus,
  type SignalType,
  type SignalsFeedQuery,
} from "../types/signal.types";
import {
  applyCachedStatusToSignals,
  readSignalsFeedSnapshot,
  saveSignalsFeedSnapshot,
} from "../utils/signalsCache";
const FEED_LIMIT = 15;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function getHttpMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpError) {
    return error.message;
  }

  return fallback;
}

function isSignalType(value: string | null): value is SignalType {
  return SIGNAL_TYPE_OPTIONS.includes(value as SignalType);
}

function isSignalSeverity(value: string | null): value is Severity {
  return SEVERITY_OPTIONS.includes(value as Severity);
}

function isSignalStatus(value: string | null): value is SignalStatus {
  return SIGNAL_STATUS_OPTIONS.includes(value as SignalStatus);
}

function dedupeSignals(previous: Signal[], next: Signal[]): Signal[] {
  const byId = new Map<string, Signal>();

  for (const signal of previous) {
    byId.set(signal.id, signal);
  }

  for (const signal of next) {
    byId.set(signal.id, signal);
  }

  return Array.from(byId.values());
}

function makeQueryKey(query: SignalsFeedQuery): string {
  return JSON.stringify({
    limit: query.limit,
    signalType: query.signalType ?? "",
    severity: query.severity ?? "",
    status: query.status ?? "",
    q: query.q ?? "",
  });
}

function getSeverityClass(severity: string): string {
  if (severity === "CRITICA" || severity === "CRITICAL") {
    return "border-red-400/40 bg-red-500/10 text-red-100";
  }

  if (severity === "ALTA" || severity === "HIGH") {
    return "border-orange-400/40 bg-orange-500/10 text-orange-100";
  }

  if (severity === "MEDIA" || severity === "MEDIUM") {
    return "border-yellow-400/40 bg-yellow-500/10 text-yellow-100";
  }

  return "border-cyan-400/40 bg-cyan-500/10 text-cyan-100";
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

export function SignalsFeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const signalTypeParam = searchParams.get("signalType");
  const severityParam = searchParams.get("severity");
  const statusParam = searchParams.get("status");
  const qParam = searchParams.get("q") ?? "";

  const query = useMemo<SignalsFeedQuery>(() => {
    return {
      limit: FEED_LIMIT,
      signalType: isSignalType(signalTypeParam) ? signalTypeParam : undefined,
      severity: isSignalSeverity(severityParam) ? severityParam : undefined,
      status: isSignalStatus(statusParam) ? statusParam : undefined,
      q: qParam.trim() || undefined,
    };
  }, [signalTypeParam, severityParam, statusParam, qParam]);

  const queryKey = useMemo(() => makeQueryKey(query), [query]);

  const [items, setItems] = useState<Signal[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalEstimate, setTotalEstimate] = useState(0);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const versionRef = useRef(0);

  const updateSearch = useCallback(
    (key: string, value: string) => {
      const nextParams = new URLSearchParams(searchParams);

      if (value) {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }

      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams]
  );

  const loadPage = useCallback(
    async (
      cursor: string | null,
      mode: "initial" | "more",
      requestVersion: number
    ) => {
      if (inFlightRef.current) {
        return;
      }

      const controller = new AbortController();

      abortRef.current?.abort();
      abortRef.current = controller;
      inFlightRef.current = true;

      if (mode === "initial") {
        setIsInitialLoading(true);
        setInitialError(null);
      } else {
        setIsLoadingMore(true);
        setPageError(null);
      }

      try {
        const data = await getSignalsFeed(
          {
            ...query,
            cursor: cursor ?? undefined,
          },
          controller.signal
        );

        if (requestVersion !== versionRef.current) {
          return;
        }

        const nextItems = applyCachedStatusToSignals(data.items, query.status);

        if (mode === "initial") {
          setItems(nextItems);
        } else {
          setItems((previous) => dedupeSignals(previous, nextItems));
        }

        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
        setTotalEstimate(data.totalEstimate);
      } catch (caughtError: unknown) {
        if (isAbortError(caughtError)) {
          return;
        }

        const message = getHttpMessage(
          caughtError,
          "No se pudo cargar el feed de Senales."
        );

        if (mode === "initial") {
          setInitialError(message);
        } else {
          setPageError(message);
        }
      } finally {
        if (requestVersion === versionRef.current) {
          setIsInitialLoading(false);
          setIsLoadingMore(false);
        }

        if (abortRef.current === controller) {
          abortRef.current = null;
        }

        inFlightRef.current = false;
      }
    },
    [query]
  );

  useEffect(() => {
    versionRef.current += 1;
    const version = versionRef.current;

    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;

    const snapshot = readSignalsFeedSnapshot(queryKey);

    setInitialError(null);
    setPageError(null);

    if (snapshot) {
      setItems(applyCachedStatusToSignals(snapshot.items, query.status));
      setNextCursor(snapshot.nextCursor);
      setHasMore(snapshot.hasMore);
      setTotalEstimate(snapshot.totalEstimate);
      setIsInitialLoading(false);
      setIsLoadingMore(false);

      window.requestAnimationFrame(() => {
        window.scrollTo({ top: snapshot.scrollY });
      });

      return () => {
        abortRef.current?.abort();
      };
    }

    setItems([]);
    setNextCursor(null);
    setHasMore(true);
    setTotalEstimate(0);

    void loadPage(null, "initial", version);

    return () => {
      abortRef.current?.abort();
    };
  }, [queryKey, query.status, loadPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];

        if (
          firstEntry.isIntersecting &&
          hasMore &&
          !isInitialLoading &&
          !isLoadingMore &&
          !pageError &&
          nextCursor
        ) {
          void loadPage(nextCursor, "more", versionRef.current);
        }
      },
      {
        root: null,
        rootMargin: "600px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [
    hasMore,
    isInitialLoading,
    isLoadingMore,
    pageError,
    nextCursor,
    loadPage,
  ]);

  function saveFeedBeforeLeaving() {
    saveSignalsFeedSnapshot({
      key: queryKey,
      items,
      nextCursor,
      hasMore,
      totalEstimate,
      scrollY: window.scrollY,
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
          Feed infinito
        </p>

        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Senales</h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Monitorea eventos reales emitidos por Tropeles. Los filtros se
              guardan en la URL y la carga usa cursor real del servidor.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
            Estimado:{" "}
            <span className="font-bold text-white">{totalEstimate}</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-300">Tipo</span>
            <select
              value={query.signalType ?? ""}
              onChange={(event) =>
                updateSearch("signalType", event.target.value)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
            >
              <option value="">Todos</option>
              {SIGNAL_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-300">
              Severidad
            </span>
            <select
              value={query.severity ?? ""}
              onChange={(event) => updateSearch("severity", event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
            >
              <option value="">Todas</option>
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-300">Estado</span>
            <select
              value={query.status ?? ""}
              onChange={(event) => updateSearch("status", event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
            >
              <option value="">Todos</option>
              {SIGNAL_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-semibold text-slate-300">
              Busqueda
            </span>
            <input
              value={qParam}
              onChange={(event) => updateSearch("q", event.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />
          </label>
        </div>
      </section>

      <section className="min-h-[520px] rounded-2xl border border-slate-800 bg-slate-900 p-4">
        {isInitialLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-xl border border-slate-800 bg-slate-950"
              />
            ))}
          </div>
        )}

        {!isInitialLoading && initialError && (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-6">
            <h2 className="text-xl font-bold text-red-100">
              Error al cargar el feed
            </h2>
            <p className="mt-2 text-red-200">{initialError}</p>
            <button
              onClick={() => void loadPage(null, "initial", versionRef.current)}
              className="mt-4 rounded-lg bg-red-400 px-4 py-2 font-semibold text-slate-950 hover:bg-red-300"
            >
              Reintentar
            </button>
          </div>
        )}

        {!isInitialLoading && !initialError && items.length === 0 && (
          <div className="flex min-h-[380px] items-center justify-center rounded-xl border border-dashed border-slate-700">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">
                No hay Senales para estos filtros
              </h2>
              <p className="mt-2 text-slate-400">
                Cambia la busqueda o limpia los filtros.
              </p>
            </div>
          </div>
        )}

        {!isInitialLoading && !initialError && items.length > 0 && (
          <div className="space-y-3">
            {items.map((signal) => (
              <Link
                key={signal.id}
                to={`/signals/${encodeURIComponent(signal.id)}`}
                state={{
                  fromFeed: `/signals?${searchParams.toString()}`,
                }}
                onClick={saveFeedBeforeLeaving}
                className="block rounded-xl border border-slate-800 bg-slate-950 p-4 transition hover:border-cyan-400/60 hover:bg-slate-900"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                        {signal.signalType}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getSeverityClass(
                          signal.severity
                        )}`}
                      >
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

                    <p className="mt-3 text-lg font-semibold text-white">
                      {signal.rawContent}
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                      Tropel:{" "}
                      <span className="text-slate-200">
                        {signal.tropel.name}
                      </span>{" "}
                      · {signal.tropel.species}
                    </p>
                  </div>

                  <div className="text-sm text-slate-500 md:text-right">
                    <p>{new Date(signal.createdAt).toLocaleString()}</p>
                    <p className="mt-1">ID: {signal.id}</p>
                  </div>
                </div>
              </Link>
            ))}

            <div ref={sentinelRef} className="h-10" />

            {isLoadingMore && (
              <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-center text-slate-300">
                Cargando mas Senales...
              </p>
            )}

            {pageError && (
              <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4">
                <p className="font-semibold text-red-100">{pageError}</p>
                <button
                  onClick={() =>
                    void loadPage(nextCursor, "more", versionRef.current)
                  }
                  className="mt-3 rounded-lg bg-red-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-red-300"
                >
                  Reintentar carga
                </button>
              </div>
            )}

            {!hasMore && (
              <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-center text-slate-400">
                Fin de la lista.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}