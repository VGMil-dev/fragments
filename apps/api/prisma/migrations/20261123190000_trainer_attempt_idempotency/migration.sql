ALTER TABLE "trainer_attempts"
ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "trainer_attempt_idempotency"
ON "trainer_attempts"("session_hash", "idempotency_key");
