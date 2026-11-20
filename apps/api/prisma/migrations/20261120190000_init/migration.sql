-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "isTeacher" BOOLEAN NOT NULL DEFAULT false,
    "githubLogin" TEXT,
    "role" TEXT,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banExpiresAt" TIMESTAMPTZ(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lease_owner" TEXT,
    "lease_until" TIMESTAMPTZ(3),
    "heartbeat_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "last_stage" TEXT,
    "last_error_code" TEXT,
    "retry_class" TEXT,
    "next_retry_at" TIMESTAMPTZ(3),

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_attempts" (
    "job_id" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "duration_ms" BIGINT,
    "stage" TEXT,
    "error_code" TEXT,
    "retry_class" TEXT,
    "final_status" TEXT NOT NULL,

    CONSTRAINT "review_attempts_pkey" PRIMARY KEY ("job_id","attempt")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "proposal_json" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "owner_hash" TEXT,
    "owner_user_id" TEXT,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_revisions" (
    "proposal_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "proposal_json" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "proposal_revisions_pkey" PRIMARY KEY ("proposal_id","version")
);

-- CreateTable
CREATE TABLE "mentor_gallery_optins" (
    "proposal_id" TEXT NOT NULL,
    "proposal_version" INTEGER NOT NULL,
    "opted_in" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mentor_gallery_optins_pkey" PRIMARY KEY ("proposal_id")
);

-- CreateTable
CREATE TABLE "mentor_evaluations" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "proposal_version" INTEGER NOT NULL,
    "evaluation_json" JSONB NOT NULL,
    "evaluated_at" TIMESTAMPTZ(3) NOT NULL,
    "input_digest" TEXT,
    "context_version" INTEGER,

    CONSTRAINT "mentor_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "content_hash" TEXT NOT NULL,
    "verification_code" TEXT NOT NULL,
    "rubric_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspector_challenges" (
    "id" TEXT NOT NULL,
    "ai_operation_key" TEXT,
    "review_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "commit_sha" TEXT NOT NULL,
    "challenge_json" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "assigned_to" TEXT,
    "assigned_at" TIMESTAMPTZ(3),
    "superseded_by_commit_sha" TEXT,
    "defense_json" JSONB,

    CONSTRAINT "inspector_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_budget_reservations" (
    "id" TEXT NOT NULL,
    "request_kind" TEXT NOT NULL,
    "reserved_microusd" BIGINT NOT NULL,
    "actual_microusd" BIGINT,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "operation_key" TEXT,

    CONSTRAINT "ai_budget_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_sessions" (
    "session_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trainer_sessions_pkey" PRIMARY KEY ("session_hash")
);

-- CreateTable
CREATE TABLE "trainer_banks" (
    "review_id" TEXT NOT NULL,
    "commit_sha" TEXT NOT NULL,
    "challenges_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "bank_ready" BOOLEAN NOT NULL DEFAULT false,
    "generation_owner" TEXT,
    "generation_lease_until" BIGINT,

    CONSTRAINT "trainer_banks_pkey" PRIMARY KEY ("review_id","commit_sha")
);

-- CreateTable
CREATE TABLE "trainer_attempts" (
    "id" TEXT NOT NULL,
    "session_hash" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "hints_used" INTEGER NOT NULL,
    "attempted_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trainer_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_control_draft" (
    "id" INTEGER NOT NULL,
    "config_json" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mentor_control_draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_control_versions" (
    "version" INTEGER NOT NULL,
    "config_json" JSONB NOT NULL,
    "published_at" TIMESTAMPTZ(3) NOT NULL,
    "published_by" TEXT NOT NULL,

    CONSTRAINT "mentor_control_versions_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "mentor_academic_publications" (
    "proposal_id" TEXT NOT NULL,
    "proposal_version" INTEGER NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "context_version" INTEGER NOT NULL,
    "rubric_version" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mentor_academic_publications_pkey" PRIMARY KEY ("proposal_id","proposal_version")
);

-- CreateTable
CREATE TABLE "mentor_academic_project_moderation" (
    "proposal_id" TEXT NOT NULL,
    "withdrawn_by" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "withdrawn_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mentor_academic_project_moderation_pkey" PRIMARY KEY ("proposal_id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "group_label" TEXT NOT NULL,
    "identity_key" TEXT NOT NULL,
    "period" TEXT,
    "context" TEXT,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_join_codes" (
    "id" TEXT NOT NULL,
    "classroom_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "revoked_by" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "class_join_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_enrollments" (
    "id" TEXT NOT NULL,
    "classroom_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "requested_at" TIMESTAMPTZ(3) NOT NULL,
    "decided_at" TIMESTAMPTZ(3),
    "decided_by" TEXT,

    CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_enrollment_events" (
    "enrollment_id" TEXT NOT NULL,
    "previous_status" TEXT,
    "next_status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "class_enrollment_events_pkey" PRIMARY KEY ("enrollment_id","created_at","source")
);

-- CreateTable
CREATE TABLE "class_join_attempts" (
    "student_id" TEXT NOT NULL,
    "window_started_at" TIMESTAMPTZ(3) NOT NULL,
    "attempt_count" INTEGER NOT NULL,

    CONSTRAINT "class_join_attempts_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "teacher_skills" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "description" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "teacher_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classroom_skill_availability" (
    "classroom_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "classroom_skill_availability_pkey" PRIMARY KEY ("classroom_id","skill_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_idempotency_key_key" ON "jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "jobs_claimable" ON "jobs"("status", "lease_until", "created_at");

-- CreateIndex
CREATE INDEX "review_attempts_started" ON "review_attempts"("started_at" DESC);

-- CreateIndex
CREATE INDEX "proposals_owner_user" ON "proposals"("owner_user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "mentor_evaluations_proposal" ON "mentor_evaluations"("proposal_id", "proposal_version");

-- CreateIndex
CREATE INDEX "mentor_evaluations_history" ON "mentor_evaluations"("evaluated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "mentor_evaluations_idempotency" ON "mentor_evaluations"("proposal_id", "proposal_version", "input_digest", "context_version");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_verification_code_key" ON "submissions"("verification_code");

-- CreateIndex
CREATE INDEX "submissions_source" ON "submissions"("kind", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "inspector_challenges_ai_operation_key_key" ON "inspector_challenges"("ai_operation_key");

-- CreateIndex
CREATE INDEX "inspector_challenges_review" ON "inspector_challenges"("review_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_budget_reservations_status" ON "ai_budget_reservations"("status", "created_at");

-- CreateIndex
CREATE INDEX "ai_budget_reservations_operation" ON "ai_budget_reservations"("operation_key", "created_at" DESC);

-- CreateIndex
CREATE INDEX "trainer_attempt_history" ON "trainer_attempts"("session_hash", "review_id", "attempted_at");

-- CreateIndex
CREATE INDEX "trainer_attempt_challenge" ON "trainer_attempts"("session_hash", "challenge_id", "attempted_at");

-- CreateIndex
CREATE INDEX "mentor_academic_publications_recent" ON "mentor_academic_publications"("published_at" DESC);

-- CreateIndex
CREATE INDEX "classrooms_teacher" ON "classrooms"("teacher_id", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_id_teacher_id_key" ON "classrooms"("id", "teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_teacher_id_identity_key_key" ON "classrooms"("teacher_id", "identity_key");

-- CreateIndex
CREATE UNIQUE INDEX "class_join_codes_code_hash_key" ON "class_join_codes"("code_hash");

-- CreateIndex
CREATE INDEX "class_join_codes_live" ON "class_join_codes"("classroom_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "class_enrollments_classroom" ON "class_enrollments"("classroom_id", "status", "requested_at");

-- CreateIndex
CREATE INDEX "class_enrollments_student" ON "class_enrollments"("student_id", "status", "requested_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "class_enrollments_classroom_id_student_id_key" ON "class_enrollments"("classroom_id", "student_id");

-- CreateIndex
CREATE INDEX "class_enrollment_events_history" ON "class_enrollment_events"("enrollment_id", "created_at");

-- CreateIndex
CREATE INDEX "teacher_skills_owner" ON "teacher_skills"("teacher_id", "archived", "name");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_skills_teacher_id_normalized_name_key" ON "teacher_skills"("teacher_id", "normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_skills_id_teacher_id_key" ON "teacher_skills"("id", "teacher_id");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_attempts" ADD CONSTRAINT "review_attempts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_revisions" ADD CONSTRAINT "proposal_revisions_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_gallery_optins" ADD CONSTRAINT "mentor_gallery_optins_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_evaluations" ADD CONSTRAINT "mentor_evaluations_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_attempts" ADD CONSTRAINT "trainer_attempts_session_hash_fkey" FOREIGN KEY ("session_hash") REFERENCES "trainer_sessions"("session_hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_academic_publications" ADD CONSTRAINT "mentor_academic_publications_proposal_id_proposal_version_fkey" FOREIGN KEY ("proposal_id", "proposal_version") REFERENCES "proposal_revisions"("proposal_id", "version") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_academic_publications" ADD CONSTRAINT "mentor_academic_publications_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "mentor_evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_academic_publications" ADD CONSTRAINT "mentor_academic_publications_context_version_fkey" FOREIGN KEY ("context_version") REFERENCES "mentor_control_versions"("version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_academic_project_moderation" ADD CONSTRAINT "mentor_academic_project_moderation_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_academic_project_moderation" ADD CONSTRAINT "mentor_academic_project_moderation_withdrawn_by_fkey" FOREIGN KEY ("withdrawn_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_join_codes" ADD CONSTRAINT "class_join_codes_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_join_codes" ADD CONSTRAINT "class_join_codes_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_join_codes" ADD CONSTRAINT "class_join_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollment_events" ADD CONSTRAINT "class_enrollment_events_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "class_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollment_events" ADD CONSTRAINT "class_enrollment_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_join_attempts" ADD CONSTRAINT "class_join_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_skills" ADD CONSTRAINT "teacher_skills_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_skill_availability" ADD CONSTRAINT "classroom_skill_availability_classroom_id_teacher_id_fkey" FOREIGN KEY ("classroom_id", "teacher_id") REFERENCES "classrooms"("id", "teacher_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classroom_skill_availability" ADD CONSTRAINT "classroom_skill_availability_skill_id_teacher_id_fkey" FOREIGN KEY ("skill_id", "teacher_id") REFERENCES "teacher_skills"("id", "teacher_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- State and invariant checks are kept explicit because Prisma schema syntax does not model CHECK constraints.
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_status_check" CHECK ("status" IN ('pending', 'leased', 'done', 'failed'));
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_attempts_check" CHECK ("attempts" >= 0);
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_retry_class_check" CHECK ("retry_class" IS NULL OR "retry_class" IN ('transient', 'permanent', 'manual'));
ALTER TABLE "review_attempts" ADD CONSTRAINT "review_attempts_number_check" CHECK ("attempt" > 0);
ALTER TABLE "review_attempts" ADD CONSTRAINT "review_attempts_status_check" CHECK ("final_status" IN ('running', 'completed', 'failed'));
ALTER TABLE "review_attempts" ADD CONSTRAINT "review_attempts_retry_class_check" CHECK ("retry_class" IS NULL OR "retry_class" IN ('transient', 'permanent', 'manual'));
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_version_check" CHECK ("version" > 0);
ALTER TABLE "proposal_revisions" ADD CONSTRAINT "proposal_revisions_version_check" CHECK ("version" > 0);
ALTER TABLE "mentor_gallery_optins" ADD CONSTRAINT "mentor_gallery_version_check" CHECK ("proposal_version" > 0);
ALTER TABLE "mentor_evaluations" ADD CONSTRAINT "mentor_evaluations_version_check" CHECK ("proposal_version" > 0);
ALTER TABLE "mentor_evaluations" ADD CONSTRAINT "mentor_evaluations_context_check" CHECK ("context_version" IS NULL OR "context_version" > 0);
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_kind_check" CHECK ("kind" IN ('mentor', 'review'));
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_score_check" CHECK ("score" >= 0 AND "score" <= 100);
ALTER TABLE "inspector_challenges" ADD CONSTRAINT "inspector_challenges_status_check" CHECK ("status" IN ('pending', 'assigned', 'completed', 'obsolete'));
ALTER TABLE "ai_budget_reservations" ADD CONSTRAINT "ai_budget_reservations_amount_check" CHECK ("reserved_microusd" > 0 AND ("actual_microusd" IS NULL OR "actual_microusd" >= 0));
ALTER TABLE "ai_budget_reservations" ADD CONSTRAINT "ai_budget_reservations_status_check" CHECK ("status" IN ('reserved', 'settled', 'uncertain', 'released'));
CREATE UNIQUE INDEX "ai_budget_reservations_active_operation" ON "ai_budget_reservations"("operation_key") WHERE "operation_key" IS NOT NULL AND "status" <> 'released';
ALTER TABLE "trainer_banks" ADD CONSTRAINT "trainer_banks_ready_check" CHECK ("bank_ready" IN (true, false));
ALTER TABLE "trainer_attempts" ADD CONSTRAINT "trainer_attempts_status_check" CHECK ("status" IN ('pending', 'in_progress', 'completed', 'need_more'));
ALTER TABLE "trainer_attempts" ADD CONSTRAINT "trainer_attempts_hints_check" CHECK ("hints_used" BETWEEN 0 AND 3);
ALTER TABLE "mentor_control_draft" ADD CONSTRAINT "mentor_control_draft_singleton_check" CHECK ("id" = 1);
ALTER TABLE "mentor_control_versions" ADD CONSTRAINT "mentor_control_versions_positive_check" CHECK ("version" > 0);
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_status_check" CHECK ("status" IN ('active', 'archived'));
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_status_check" CHECK ("status" IN ('pending', 'active', 'rejected', 'removed'));
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_source_check" CHECK ("source" IN ('join_code', 'teacher_assignment'));
ALTER TABLE "class_enrollment_events" ADD CONSTRAINT "class_enrollment_events_status_check" CHECK ("next_status" IN ('pending', 'active', 'rejected', 'removed') AND ("previous_status" IS NULL OR "previous_status" IN ('pending', 'active', 'rejected', 'removed')));
ALTER TABLE "class_enrollment_events" ADD CONSTRAINT "class_enrollment_events_source_check" CHECK ("source" IN ('join_code', 'teacher_assignment', 'teacher_approval', 'teacher_rejection', 'teacher_removal'));
ALTER TABLE "class_join_attempts" ADD CONSTRAINT "class_join_attempts_count_check" CHECK ("attempt_count" >= 0);
ALTER TABLE "classroom_skill_availability" ADD CONSTRAINT "classroom_skill_availability_enabled_check" CHECK ("enabled" IN (true, false));

INSERT INTO "mentor_control_versions" ("version", "config_json", "published_at", "published_by")
VALUES (1, '{"subject":"Proyectos estudiantiles","theme":"Idea de proyecto","assignment":"Describe un problema, una solución inicial y un alcance que puedas demostrar.","requirements":["Propón una primera versión pequeña y comprobable."],"expectedLevel":"Estudiante que inicia su proyecto","rubricTitle":"Propuesta inicial","criteria":[{"id":"problem","title":"Problema claro","description":"Explica a quién le ocurre y qué necesita resolver.","weight":25},{"id":"solution","title":"Solución relacionada","description":"La idea responde al problema descrito.","weight":20},{"id":"scope","title":"Alcance de MVP","description":"La primera versión cabe en el tiempo y nivel indicados.","weight":25},{"id":"goals","title":"Objetivos comprobables","description":"Se puede observar o comprobar si cada objetivo se logró.","weight":15},{"id":"feasibility","title":"Viabilidad inicial","description":"Las herramientas y condiciones descritas permiten empezar.","weight":15}]}'::jsonb, CURRENT_TIMESTAMP, 'system-seed')
ON CONFLICT ("version") DO NOTHING;

INSERT INTO "mentor_control_draft" ("id", "config_json", "updated_at")
SELECT 1, "config_json", "published_at" FROM "mentor_control_versions" WHERE "version" = 1
ON CONFLICT ("id") DO NOTHING;
