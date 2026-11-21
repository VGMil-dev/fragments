CREATE TABLE "technology_catalog_items" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "technology_catalog_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "technology_catalog_items_slug_key" ON "technology_catalog_items"("slug");
CREATE INDEX "technology_catalog_name_id" ON "technology_catalog_items"("name", "id");

CREATE TABLE "classroom_technology_availability" (
    "classroom_id" TEXT NOT NULL,
    "technology_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "classroom_technology_availability_pkey" PRIMARY KEY ("classroom_id", "technology_id")
);

CREATE INDEX "classroom_technology_availability_enabled" ON "classroom_technology_availability"("technology_id", "enabled");
ALTER TABLE "classroom_technology_availability" ADD CONSTRAINT "classroom_technology_availability_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "classroom_technology_availability" ADD CONSTRAINT "classroom_technology_availability_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technology_catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
