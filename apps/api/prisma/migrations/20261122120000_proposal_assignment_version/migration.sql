ALTER TABLE "proposals"
ADD COLUMN "assignment_version_id" TEXT;

CREATE INDEX "proposals_assignment_version" ON "proposals"("assignment_version_id");

ALTER TABLE "proposals"
ADD CONSTRAINT "proposals_assignment_version_id_fkey"
FOREIGN KEY ("assignment_version_id") REFERENCES "classroom_assignment_versions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
