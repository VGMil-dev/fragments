export type TrainerOperationalEvent = {
  event: "trainer.attempt.finished" | "trainer.attempt.failed";
  stage: "attempt_record";
  result: "success" | "failure";
  error_code: "none" | "attempt_failed";
  duration_ms: number;
  occurredAt: string;
};

export type AdminTrainerEventsApi = {
  read: () => Promise<
    | { ok: true; data: { events: TrainerOperationalEvent[] } }
    | { ok: false; error: { code: string } }
  >;
};
