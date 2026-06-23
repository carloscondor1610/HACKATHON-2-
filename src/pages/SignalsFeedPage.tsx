import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
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

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isOneOf<T extends string>(
  options: readonly T[],
  value: string | null
): value is T {
  return value !== null && options.includes(value as T);
}

function parseLimit(value: string | null): 15 | 30 {
  return value === "30" ? 30 : 15;
}

function dedupeSignals(previous: Signal[], incoming: Signal[]): Signal[] {
  const ids = new Set(previous.map((signal) => signal.id));
  return [...previous, ...incoming.filter((signal) => !ids.has(signal.id))];
}

function getSeverityClass(severity: Severity): string {
  if (severity === "CRITICO") return "border-red-400/40 bg-red-500/10 text-red-200";
  if (severity === "GRAVE") return "border-yellow-400/40 bg-yellow-500/10 text-yellow-100";
  if (severity === "MODERADO") return "border-purple-400/40 bg-purple-500/10 text-purple-200";
  return "border-green-400/40 bg-green-500/10 text-green-200";
}

function getStatusClass(status: SignalStatus): string {
  if (status === "ATENDIDA") return "border-green-400/40 bg-green-500/10 text-green-200";
  if (status === "PROCESANDO") return "border-yellow-400/40 bg-yellow-500/10 text-yellow-100";
  return "border-slate-600 bg-slate-800 text-slate-200";
}

function Badge({
  children,
  className,
}: {
  children: string;
  className: string;
}) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

export function SignalsFeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [items, setItems] = useState<Signal[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalEstimate, setTotalEstimate] = useState(0);

  const [qDraft, setQDraft] = useState(searchParams.get("q") ?? "");
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const versionRef = useRef(0);

  const query = useMemo<SignalsFeedQuery>(() => {
    const signalTypeParam = searchParams.get("signalType");
    const severityParam = searchParams.get("severity");
    const statusParam = searchParams.get("status");

    const signalType: SignalType | undefined = isOneOf(SIGNAL_TYPE_OPTIONS, signalTypeParam)
      ? signalTypeParam
      : undefined;

    const severity: Severity | undefined = isOneOf(SEVERITY_OPTIONS, severityParam)
      ? severityParam
      : undefined;

    const status: SignalStatus | undefined = isOneOf(SIGNAL_STATUS_OPTIONS, statusParam)
      ? statusParam
      : undefined;

    const q = searchParams.get("q")?.trim() ?? "";

    return {
      limit: parseLimit(searchParams.get("limit")),
      signalType,
      severity,
      status,
      q: q || undefined,
    };
  }, [searchParams]);

  useEffect(() => {
    setQDraft(searchParams.get("q") ?? "");
  }, [searchParams]);

  function updateParam(name: string, value: string) {
    const next = new URLSearchParams(searchParams);

    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }

    setSearchParams(next);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateParam("q", qDraft.trim().slice(0, 80));
  }

  const loadPage = useCallback(
    async (cursor: string | null, mode: "initial" | "more", version: number) => {
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;

      if (mode === "initial") {
        setIsInitialLoading(true);
        setInitialError(null);
        setPageError(null);
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

        if (version !== versionRef.current) return;

        if (mode === "initial") {
          setItems(data.items);
        } else {
          setItems((previous) => dedupeSignals(previous, data.items));
        }

        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
        setTotalEstimate(data.totalEstimate);
      } catch (caughtError: unknown) {
        if (isAbortError(caughtError)) return;
        if (version !== versionRef.current) return;

        const message =
          caughtError instanceof HttpError
            ? caughtError.message
            : "No se pudo cargar el feed.";

        if (mode === "initial") {
          setInitialError(message);
        } else {
          setPageError(message);
        }
      } finally {
        inFlightRef.current = false;

        if (abortRef.current === controller) {
          abortRef.current = null;
        }

        if (version === versionRef.current) {
          setIsInitialLoading(false);
          setIsLoadingMore(false);
        }
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

    setItems([]);
    setNextCursor(null);
    setHasMore(true);
    setTotalEstimate(0);
    setInitialError(null);
    setPageError(null);

    void loadPage(null, "initial", version);

    return () => {
      abortRef.current?.abort();
    };
  }, [searchParams, loadPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];

        if (
          firstEntry?.isIntersecting &&
          hasMore &&
          !isInitialLoading &&
          !isLoadingMore &&
          !pageError
        ) {
          void loadPage(nextCursor, "more", versionRef.current);
        }
      },
      {
        root: null,
        rootMargin: "500px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isInitialLoading, isLoadingMore, pageError, nextCursor, loadPage]);

  function saveScrollBeforeLeaving() {
    sessionStorage.setItem("signals-scroll-y", String(window.scrollY));
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("signals-scroll-y");

    if (saved) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: Number(saved) });
      });
    }
  }, []);

  function retryInitial() {
    versionRef.current += 1;
    void loadPage(null, "initial", versionRef.current);
  }

  function retryMore() {
    void loadPage(nextCursor, "more", versionRef.current);
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
          Feed
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Feed infinito de Senales
        </h1>

        <p className="mt-2 text-slate-400">
          Cursor-based, deduplicado por ID, una request en vuelo y filtros en URL.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="grid gap-4 md:grid-cols-5">
          <form onSubmit={handleSearchSubmit} className="md:col-span-2">
            <label className="text-sm text-slate-300">Busqueda</label>

            <div className="mt-1 flex gap-2">
              <input
                value={qDraft}
                onChange={(event) => setQDraft(event.target.value)}
                maxLength={80}
                placeholder="Buscar senales..."
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />

              <button
                type="submit"
                className="rounded-lg bg-cyan-400 px-4 py-2 font-bold text-slate-950 hover:bg-cyan-300"
              >
                Buscar
              </button>
            </div>
          </form>

          <label>
            <span className="text-sm text-slate-300">Tipo</span>
            <select
              value={query.signalType ?? ""}
              onChange={(event) => updateParam("signalType", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="">Todos</option>
              {SIGNAL_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm text-slate-300">Severidad</span>
            <select
              value={query.severity ?? ""}
              onChange={(event) => updateParam("severity", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="">Todas</option>
              {SEVERITY_OPTIONS.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm text-slate-300">Estado</span>
            <select
              value={query.status ?? ""}
              onChange={(event) => updateParam("status", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="">Todos</option>
              {SIGNAL_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm text-slate-300">Limite</span>
            <select
              value={String(query.limit)}
              onChange={(event) => updateParam("limit", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="15">15</option>
              <option value="30">30</option>
            </select>
          </label>
        </div>
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
        <p className="text-sm text-slate-300">
          Estimado total: <span className="text-white">{totalEstimate}</span>
        </p>

        {(isInitialLoading || isLoadingMore) && (
          <p className="text-sm text-cyan-300">Cargando...</p>
        )}
      </section>

      {initialError && (
        <section className="rounded-2xl border border-red-400/40 bg-red-500/10 p-6">
          <h2 className="text-xl font-bold text-red-100">
            Error al cargar el feed
          </h2>
          <p className="mt-2 text-red-200">{initialError}</p>
          <button
            onClick={retryInitial}
            className="mt-4 rounded-lg bg-red-400 px-4 py-2 font-semibold text-slate-950"
          >
            Reintentar
          </button>
        </section>
      )}

      {!initialError && items.length === 0 && !isInitialLoading && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h2 className="text-2xl font-bold text-white">Sin Senales</h2>
          <p className="mt-2 text-slate-400">
            No hay Senales que coincidan con los filtros actuales.
          </p>
        </section>
      )}

      <section className="space-y-4">
        {items.map((signal) => (
          <article
            key={signal.id}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {signal.signalType}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {signal.tropel.name} · {signal.tropel.species}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className={getSeverityClass(signal.severity)}>
                  {signal.severity}
                </Badge>

                <Badge className={getStatusClass(signal.status)}>
                  {signal.status}
                </Badge>
              </div>
            </div>

            <p className="mt-4 text-slate-300">{signal.rawContent}</p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
              <span>{new Date(signal.createdAt).toLocaleString()}</span>

              <Link
                to={`/signals/${signal.id}`}
                state={{ fromFeed: `/signals${location.search}` }}
                onClick={saveScrollBeforeLeaving}
                className="rounded-lg border border-cyan-400/40 px-3 py-2 font-semibold text-cyan-200 hover:bg-cyan-400/10"
              >
                Ver detalle
              </Link>
            </div>
          </article>
        ))}
      </section>

      {pageError && (
        <section className="rounded-2xl border border-red-400/40 bg-red-500/10 p-5">
          <p className="font-semibold text-red-100">{pageError}</p>
          <p className="mt-1 text-sm text-red-200">
            Las paginas anteriores se conservaron. Puedes reintentar.
          </p>
          <button
            onClick={retryMore}
            className="mt-4 rounded-lg bg-red-400 px-4 py-2 font-semibold text-slate-950"
          >
            Reintentar carga
          </button>
        </section>
      )}

      <div ref={sentinelRef} className="h-12" />

      {!hasMore && items.length > 0 && (
        <p className="pb-10 text-center text-sm text-slate-500">
          Fin de la lista.
        </p>
      )}
    </div>
  );
}