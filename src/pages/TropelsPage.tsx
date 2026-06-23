import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { HttpError } from "../api/http";
import { getSectors } from "../api/sectors.api";
import { getTropels } from "../api/tropels.api";
import {
  SPECIES_OPTIONS,
  TROPEL_SORT_OPTIONS,
  VITAL_STATE_OPTIONS,
  type PaginatedTropelsResponse,
  type SectorSummary,
  type Species,
  type TropelSort,
  type TropelsQuery,
  type VitalState,
} from "../types/tropel.types";

type Tone = "cyan" | "green" | "yellow" | "red" | "purple" | "slate";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isOneOf<T extends string>(
  options: readonly T[],
  value: string | null
): value is T {
  return value !== null && options.includes(value as T);
}

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseSize(value: string | null): 10 | 20 | 50 {
  if (value === "10" || value === "20" || value === "50") {
    return Number(value) as 10 | 20 | 50;
  }

  return 20;
}

function getVitalTone(state: VitalState): Tone {
  if (state === "CRITICO") return "red";
  if (state === "MUTANDO" || state === "AGITADO") return "yellow";
  if (state === "HAMBRIENTO") return "purple";
  return "green";
}

function toneClass(tone: Tone): string {
  const classes: Record<Tone, string> = {
    cyan: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
    green: "border-green-400/40 bg-green-400/10 text-green-200",
    yellow: "border-yellow-400/40 bg-yellow-400/10 text-yellow-100",
    red: "border-red-400/40 bg-red-400/10 text-red-200",
    purple: "border-purple-400/40 bg-purple-400/10 text-purple-200",
    slate: "border-slate-600 bg-slate-800 text-slate-200",
  };

  return classes[tone];
}

function Badge({
  children,
  tone = "slate",
}: {
  children: string | number;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass(
        tone
      )}`}
    >
      {children}
    </span>
  );
}

export function TropelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [pageData, setPageData] =
    useState<PaginatedTropelsResponse | null>(null);
  const [sectors, setSectors] = useState<SectorSummary[]>([]);
  const [qDraft, setQDraft] = useState(searchParams.get("q") ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSectors, setIsLoadingSectors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const requestSeq = useRef(0);

  const query = useMemo<TropelsQuery>(() => {
    const speciesParam = searchParams.get("species");
    const vitalStateParam = searchParams.get("vitalState");
    const sortParam = searchParams.get("sort");

    const species: Species | undefined = isOneOf(
      SPECIES_OPTIONS,
      speciesParam
    )
      ? speciesParam
      : undefined;

    const vitalState: VitalState | undefined = isOneOf(
      VITAL_STATE_OPTIONS,
      vitalStateParam
    )
      ? vitalStateParam
      : undefined;

    const sort: TropelSort = isOneOf(TROPEL_SORT_OPTIONS, sortParam)
      ? sortParam
      : "updatedAt,desc";

    const q = searchParams.get("q")?.trim() ?? "";
    const sectorId = searchParams.get("sectorId") ?? "";

    return {
      page: parsePage(searchParams.get("page")),
      size: parseSize(searchParams.get("size")),
      species,
      vitalState,
      sectorId: sectorId || undefined,
      q: q || undefined,
      sort,
    };
  }, [searchParams]);

  useEffect(() => {
    setQDraft(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoadingSectors(true);

    getSectors(controller.signal)
      .then((response) => {
        setSectors(response.items);
      })
      .catch((caughtError: unknown) => {
        if (!isAbortError(caughtError)) {
          setSectors([]);
        }
      })
      .finally(() => {
        setIsLoadingSectors(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;

    setIsLoading(true);
    setError(null);

    getTropels(query, controller.signal)
      .then((data) => {
        if (seq !== requestSeq.current) {
          return;
        }

        setPageData(data);
      })
      .catch((caughtError: unknown) => {
        if (isAbortError(caughtError)) {
          return;
        }

        if (seq !== requestSeq.current) {
          return;
        }

        if (caughtError instanceof HttpError) {
          setError(caughtError.message);
        } else {
          setError("No se pudo cargar el atlas de Tropeles.");
        }
      })
      .finally(() => {
        if (seq === requestSeq.current) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [query, reloadKey]);

  function updateParam(name: string, value: string) {
    const next = new URLSearchParams(searchParams);

    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }

    if (name !== "page") {
      next.set("page", "0");
    }

    setSearchParams(next);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateParam("q", qDraft.trim().slice(0, 80));
  }

  function goToPage(nextPage: number) {
    updateParam("page", String(nextPage));
  }

  const totalPages = pageData?.totalPages ?? 0;
  const currentPage = pageData?.currentPage ?? query.page;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
          Atlas
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Atlas de Tropeles
        </h1>

        <p className="mt-2 text-slate-400">
          Paginacion real del servidor, filtros sincronizados con URL y descarte
          de respuestas antiguas.
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
                placeholder="Nombre, guardian..."
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
            <span className="text-sm text-slate-300">Species</span>
            <select
              value={query.species ?? ""}
              onChange={(event) => updateParam("species", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="">Todas</option>
              {SPECIES_OPTIONS.map((species) => (
                <option key={species} value={species}>
                  {species}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm text-slate-300">Vital State</span>
            <select
              value={query.vitalState ?? ""}
              onChange={(event) => updateParam("vitalState", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="">Todos</option>
              {VITAL_STATE_OPTIONS.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm text-slate-300">Orden</span>
            <select
              value={query.sort}
              onChange={(event) => updateParam("sort", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="updatedAt,desc">Actualizados primero</option>
              <option value="name,asc">Nombre A-Z</option>
              <option value="chaosIndex,desc">Caos descendente</option>
            </select>
          </label>

          <label>
            <span className="text-sm text-slate-300">
              Sector {isLoadingSectors ? "(cargando...)" : ""}
            </span>
            <select
              value={query.sectorId ?? ""}
              onChange={(event) => updateParam("sectorId", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="">Todos</option>
              {sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.sectorCode} · {sector.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm text-slate-300">Tamaño</span>
            <select
              value={String(query.size)}
              onChange={(event) => updateParam("size", event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </label>
        </div>
      </section>

      {error && (
        <section className="rounded-2xl border border-red-400/40 bg-red-500/10 p-6">
          <h2 className="text-xl font-bold text-red-100">
            Error al cargar Tropeles
          </h2>

          <p className="mt-2 text-red-200">{error}</p>

          <button
            onClick={() => setReloadKey((current) => current + 1)}
            className="mt-4 rounded-lg bg-red-400 px-4 py-2 font-semibold text-slate-950 hover:bg-red-300"
          >
            Reintentar
          </button>
        </section>
      )}

      <section className="min-h-[520px] rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm text-slate-300">
            {pageData
              ? `${pageData.totalElements} Tropeles encontrados`
              : "Buscando Tropeles..."}
          </p>

          {isLoading && (
            <p className="text-sm text-cyan-300">Actualizando...</p>
          )}
        </div>

        {pageData && pageData.content.length === 0 && !isLoading && (
          <div className="p-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-950 p-8">
              <h2 className="text-2xl font-bold text-white">Sin Tropeles</h2>

              <p className="mt-2 text-slate-400">
                No existen Tropeles que coincidan con los filtros actuales.
              </p>
            </section>
          </div>
        )}

        {pageData && pageData.content.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-950/70 text-slate-300">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Species</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Sector</th>
                  <th className="px-4 py-3">Energia</th>
                  <th className="px-4 py-3">Caos</th>
                  <th className="px-4 py-3">Guardian</th>
                  <th className="px-4 py-3">Actualizado</th>
                </tr>
              </thead>

              <tbody>
                {pageData.content.map((tropel) => (
                  <tr
                    key={tropel.id}
                    className="border-t border-slate-800 text-slate-200"
                  >
                    <td className="px-4 py-3 font-semibold text-white">
                      {tropel.name}
                    </td>

                    <td className="px-4 py-3">
                      <Badge tone="cyan">{tropel.species}</Badge>
                    </td>

                    <td className="px-4 py-3">
                      <Badge tone={getVitalTone(tropel.vitalState)}>
                        {tropel.vitalState}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      {tropel.sector.sectorCode} · {tropel.sector.name}
                    </td>

                    <td className="px-4 py-3">{tropel.energyLevel}</td>
                    <td className="px-4 py-3">{tropel.chaosIndex}</td>
                    <td className="px-4 py-3">{tropel.guardianName}</td>

                    <td className="px-4 py-3">
                      {new Date(tropel.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          Pagina {totalPages === 0 ? 0 : currentPage + 1} de {totalPages}
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => goToPage(Math.max(currentPage - 1, 0))}
            disabled={currentPage <= 0 || isLoading}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage + 1 >= totalPages || isLoading}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </section>
    </div>
  );
}