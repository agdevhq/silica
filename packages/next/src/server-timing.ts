import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";

type TimingValue = string | number | boolean | null | undefined;
type TimingFields = Record<string, TimingValue>;

type TimingTrace = {
  traceId: string;
};

const timingTrace = new AsyncLocalStorage<TimingTrace>();
let traceCounter = 0;

export function isSilicaTimingEnabled(): boolean {
  return /^(1|true|yes|debug)$/i.test(
    process.env.SILICA_TIMING_LOGS?.trim() ?? "",
  );
}

export function nowSilicaTimingMs(): number {
  return performance.now();
}

export function withSilicaTimingTrace<T>(
  event: string,
  fields: TimingFields,
  callback: () => T,
): T {
  if (!isSilicaTimingEnabled() || timingTrace.getStore()) {
    return callback();
  }

  const traceId = [process.pid, (traceCounter += 1).toString(36)].join("-");

  return timingTrace.run({ traceId }, () =>
    timeSilica(event, fields, callback),
  );
}

export function logSilicaTiming(
  event: string,
  fields: TimingFields = {},
): void {
  if (!isSilicaTimingEnabled()) return;

  const trace = timingTrace.getStore();
  const payload = {
    event,
    traceId: trace?.traceId,
    runtime: "next",
    pid: process.pid,
    ...compactTimingFields(fields),
  };

  console.log(`[silica:timing] ${JSON.stringify(payload)}`);
}

export function timeSilica<T>(
  event: string,
  fields: TimingFields,
  callback: () => T,
): T {
  if (!isSilicaTimingEnabled()) return callback();

  const start = nowSilicaTimingMs();
  logSilicaTiming(`${event}.start`, fields);
  try {
    const result = callback();
    if (isPromiseLike(result)) {
      return result.then(
        (value) => {
          logSilicaTiming(`${event}.end`, {
            ...fields,
            durationMs: roundTimingMs(nowSilicaTimingMs() - start),
          });
          return value;
        },
        (error: unknown) => {
          logSilicaTiming(`${event}.error`, {
            ...fields,
            durationMs: roundTimingMs(nowSilicaTimingMs() - start),
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        },
      ) as T;
    }
    logSilicaTiming(`${event}.end`, {
      ...fields,
      durationMs: roundTimingMs(nowSilicaTimingMs() - start),
    });
    return result;
  } catch (error) {
    logSilicaTiming(`${event}.error`, {
      ...fields,
      durationMs: roundTimingMs(nowSilicaTimingMs() - start),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function timeSilicaAsync<T>(
  event: string,
  fields: TimingFields,
  callback: () => Promise<T> | T,
): Promise<T> {
  if (!isSilicaTimingEnabled()) return callback();

  const start = nowSilicaTimingMs();
  logSilicaTiming(`${event}.start`, fields);
  try {
    const result = await callback();
    logSilicaTiming(`${event}.end`, {
      ...fields,
      durationMs: roundTimingMs(nowSilicaTimingMs() - start),
    });
    return result;
  } catch (error) {
    logSilicaTiming(`${event}.error`, {
      ...fields,
      durationMs: roundTimingMs(nowSilicaTimingMs() - start),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function roundTimingMs(value: number): number {
  return Math.round(value * 100) / 100;
}

function compactTimingFields(fields: TimingFields): TimingFields {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );
}

function isPromiseLike<T>(
  value: T | PromiseLike<Awaited<T>>,
): value is PromiseLike<Awaited<T>> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}
