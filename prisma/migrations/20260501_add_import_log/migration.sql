-- CreateTable: barber_import_logs
CREATE TABLE "barber_import_logs" (
    "id"        SERIAL       NOT NULL,
    "tenantId"  INTEGER      NOT NULL,
    "resource"  TEXT         NOT NULL,
    "action"    TEXT         NOT NULL,
    "rows"      INTEGER      NOT NULL DEFAULT 0,
    "imported"  INTEGER      NOT NULL DEFAULT 0,
    "skipped"   INTEGER      NOT NULL DEFAULT 0,
    "errors"    JSONB        NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barber_import_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "barber_import_logs"
    ADD CONSTRAINT "barber_import_logs_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "barber_tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "barber_import_logs_tenantId_resource_idx"
    ON "barber_import_logs"("tenantId", "resource");

CREATE INDEX "barber_import_logs_tenantId_createdAt_idx"
    ON "barber_import_logs"("tenantId", "createdAt");
