CREATE TABLE "classroom_assignments" (
    "id" TEXT NOT NULL,
    "classroom_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "draft_version" INTEGER NOT NULL DEFAULT 1,
    "published_version" INTEGER,
    "draft_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "classroom_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "classroom_assignment_versions" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "mentor_context_version" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "classroom_assignment_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "classroom_assignment_versions_assignment_id_version_key" ON "classroom_assignment_versions"("assignment_id", "version");
CREATE INDEX "classroom_assignments_classroom" ON "classroom_assignments"("classroom_id", "updated_at" DESC);
CREATE INDEX "classroom_assignment_versions_latest" ON "classroom_assignment_versions"("assignment_id", "version" DESC);

ALTER TABLE "classroom_assignments" ADD CONSTRAINT "classroom_assignments_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "classroom_assignment_versions" ADD CONSTRAINT "classroom_assignment_versions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "classroom_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
