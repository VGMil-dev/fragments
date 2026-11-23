CREATE TABLE "admin_operational_events" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_json" JSONB NOT NULL,
    CONSTRAINT "admin_operational_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operational_events_source_recorded" ON "admin_operational_events"("source", "recorded_at" DESC);
CREATE INDEX "operational_events_recorded" ON "admin_operational_events"("recorded_at" DESC);
