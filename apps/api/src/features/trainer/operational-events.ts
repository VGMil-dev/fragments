export type TrainerOperationalEvent = {
  event: "trainer.attempt.finished" | "trainer.attempt.failed";
  stage: "attempt_record";
  result: "success" | "failure";
  error_code: "none" | "attempt_failed";
  duration_ms: number;
  occurredAt: string;
};

const eventNames = new Set<TrainerOperationalEvent["event"]>(["trainer.attempt.finished", "trainer.attempt.failed"]);
const results = new Set<TrainerOperationalEvent["result"]>(["success", "failure"]);
const errorCodes = new Set<TrainerOperationalEvent["error_code"]>(["none", "attempt_failed"]);
const stages = new Set<TrainerOperationalEvent["stage"]>(["attempt_record"]);

/** Projects untrusted runtime or persisted JSON into the minimal Trainer event shape. */
export function projectTrainerOperationalEvent(input: unknown): TrainerOperationalEvent | null {
  if (!input || typeof input !== "object") return null;
  const event = input as Partial<TrainerOperationalEvent>;
  if (!eventNames.has(event.event as TrainerOperationalEvent["event"])
    || !results.has(event.result as TrainerOperationalEvent["result"])
    || !errorCodes.has(event.error_code as TrainerOperationalEvent["error_code"])
    || !stages.has(event.stage as TrainerOperationalEvent["stage"])) return null;
  if ((event.result === "success" && (event.event !== "trainer.attempt.finished" || event.error_code !== "none"))
    || (event.result === "failure" && (event.event !== "trainer.attempt.failed" || event.error_code !== "attempt_failed"))) return null;

  return {
    event: event.event!,
    stage: event.stage!,
    result: event.result!,
    error_code: event.error_code!,
    duration_ms: safeDuration(event.duration_ms),
    occurredAt: isCanonicalUtcTimestamp(event.occurredAt) ? event.occurredAt : new Date().toISOString(),
  };
}

type OperationalWriter = (line: string) => unknown;

export function writeTrainerOperationalEvent(event: TrainerOperationalEvent, write: OperationalWriter = writeToStdout): void {
  const safeEvent = projectTrainerOperationalEvent(event);
  if (!safeEvent) return;
  try {
    const result = write(JSON.stringify(safeEvent));
    if (result && typeof (result as PromiseLike<unknown>).then === "function") {
      void Promise.resolve(result).catch(() => { /* Operational logging must not change attempt results. */ });
    }
  } catch { /* Operational logging must not change attempt results. */ }
}

function writeToStdout(line: string): Promise<void> {
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      process.stdout.off("error", finish);
      resolve();
    };
    process.stdout.once("error", finish);
    try { process.stdout.write(`${line}\n`, finish); } catch { finish(); }
  });
}

function safeDuration(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(300_000, Math.max(0, Math.round(value))) : 300_000;
}

function isCanonicalUtcTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}
