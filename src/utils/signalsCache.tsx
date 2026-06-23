import type {
  Signal,
  SignalAttendableStatus,
  SignalStatus,
  SignalStatusCache,
} from "../types/signal.types";

const SIGNALS_FEED_SNAPSHOT_KEY = "signals-feed-snapshot";
const SIGNAL_STATUS_CACHE_KEY = "signals-last-status-update";

export interface SignalsFeedSnapshot {
  key: string;
  items: Signal[];
  nextCursor: string | null;
  hasMore: boolean;
  totalEstimate: number;
  scrollY: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSignalAttendableStatus(value: unknown): value is SignalAttendableStatus {
  return value === "PROCESANDO" || value === "ATENDIDA";
}

export function saveSignalStatusCache(signal: Signal): void {
  if (!isSignalAttendableStatus(signal.status)) {
    return;
  }

  const cache: SignalStatusCache = {
    id: signal.id,
    status: signal.status,
    updatedAt: signal.updatedAt,
  };

  sessionStorage.setItem(SIGNAL_STATUS_CACHE_KEY, JSON.stringify(cache));
}

function readSignalStatusCache(): SignalStatusCache | null {
  const raw = sessionStorage.getItem(SIGNAL_STATUS_CACHE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) {
      return null;
    }

    if (
      typeof parsed.id !== "string" ||
      !isSignalAttendableStatus(parsed.status) ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    return {
      id: parsed.id,
      status: parsed.status,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function applyCachedStatusToSignals(
  signals: Signal[],
  filterStatus?: SignalStatus
): Signal[] {
  const cached = readSignalStatusCache();

  if (!cached) {
    return signals;
  }

  return signals.flatMap((signal) => {
    if (signal.id !== cached.id) {
      return [signal];
    }

    if (filterStatus && cached.status !== filterStatus) {
      return [];
    }

    return [
      {
        ...signal,
        status: cached.status,
        updatedAt: cached.updatedAt,
      },
    ];
  });
}

export function saveSignalsFeedSnapshot(snapshot: SignalsFeedSnapshot): void {
  sessionStorage.setItem(SIGNALS_FEED_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function readSignalsFeedSnapshot(key: string): SignalsFeedSnapshot | null {
  const raw = sessionStorage.getItem(SIGNALS_FEED_SNAPSHOT_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) {
      return null;
    }

    if (
      typeof parsed.key !== "string" ||
      parsed.key !== key ||
      !Array.isArray(parsed.items) ||
      typeof parsed.hasMore !== "boolean" ||
      typeof parsed.totalEstimate !== "number" ||
      typeof parsed.scrollY !== "number"
    ) {
      return null;
    }

    const nextCursor = parsed.nextCursor;

    if (nextCursor !== null && typeof nextCursor !== "string") {
      return null;
    }

    const nextCursorValue: string | null =
      typeof nextCursor === "string" ? nextCursor : null;

    return {
      key: parsed.key,
      items: parsed.items as Signal[],
      nextCursor: nextCursorValue,
      hasMore: parsed.hasMore,
      totalEstimate: parsed.totalEstimate,
      scrollY: parsed.scrollY,
    };
  } catch {
    return null;
  }
}