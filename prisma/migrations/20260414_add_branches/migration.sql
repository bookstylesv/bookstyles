-- ════════════════════════════════════════════════════════════
-- Fase 2: Sucursales — Migración + Backfill
-- ════════════════════════════════════════════════════════════

-- Enum
CREATE TYPE "BarberBranchStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- Tabla barber_branches
CREATE TABLE "barber_branches" (
    "id"             SERIAL NOT NULL,
    "tenantId"       INTEGER NOT NULL,
    "name"           TEXT NOT NULL,
    "slug"           TEXT NOT NULL,
    "address"        TEXT,
    "phone"          TEXT,
    "email"          TEXT,
    "city"           TEXT,
    "businessHours"  JSONB NOT NULL DEFAULT '[]',
    "isHeadquarters" BOOLEAN NOT NULL DEFAULT false,
    "status"         "BarberBranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "managerId"      INTEGER,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barber_branches_pkey" PRIMARY KEY ("id")
);

-- Tabla barber_branch_assignments
CREATE TABLE "barber_branch_assignments" (
    "id"        SERIAL NOT NULL,
    "branchId"  INTEGER NOT NULL,
    "barberId"  INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barber_branch_assignments_pkey" PRIMARY KEY ("id")
);

-- Índices y constraints de branches
CREATE UNIQUE INDEX "barber_branches_tenantId_slug_key" ON "barber_branches"("tenantId", "slug");
CREATE INDEX "barber_branches_tenantId_idx" ON "barber_branches"("tenantId");

-- Índices y constraints de assignments
CREATE UNIQUE INDEX "barber_branch_assignments_branchId_barberId_key"
    ON "barber_branch_assignments"("branchId", "barberId");

-- FKs de branches
ALTER TABLE "barber_branches"
    ADD CONSTRAINT "barber_branches_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "barber_tenants"("id") ON DELETE CASCADE;

-- FKs de assignments
ALTER TABLE "barber_branch_assignments"
    ADD CONSTRAINT "barber_branch_assignments_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "barber_branches"("id") ON DELETE CASCADE;

ALTER TABLE "barber_branch_assignments"
    ADD CONSTRAINT "barber_branch_assignments_barberId_fkey"
    FOREIGN KEY ("barberId") REFERENCES "barbers"("id") ON DELETE CASCADE;

-- ── BACKFILL: Crear casa matriz para cada tenant existente ──────────────────
-- El slug 'principal' identifica la casa matriz.
-- Se copian nombre, dirección, teléfono, email y ciudad del tenant.

INSERT INTO "barber_branches" (
    "tenantId", "name", "slug", "address", "phone", "email",
    "city", "businessHours", "isHeadquarters", "status", "updatedAt"
)
SELECT
    t.id,
    t.name,
    'principal',
    t.address,
    t.phone,
    t.email,
    t.city,
    t."businessHours",
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP
FROM "barber_tenants" t
WHERE t."deletedAt" IS NULL;

-- ── Agregar branchId (nullable) a tablas operativas ────────────────────────

ALTER TABLE "barber_appointments" ADD COLUMN "branchId" INTEGER;
ALTER TABLE "barber_turnos"       ADD COLUMN "branchId" INTEGER;
ALTER TABLE "barber_ventas"       ADD COLUMN "branchId" INTEGER;
ALTER TABLE "barber_gastos"       ADD COLUMN "branchId" INTEGER;
ALTER TABLE "barber_compras"      ADD COLUMN "branchId" INTEGER;
ALTER TABLE "barber_planillas"    ADD COLUMN "branchId" INTEGER;
ALTER TABLE "barber_kardex"       ADD COLUMN "branchId" INTEGER;
ALTER TABLE "barber_day_overrides" ADD COLUMN "branchId" INTEGER;
ALTER TABLE "barber_correlativos"  ADD COLUMN "branchId" INTEGER;
ALTER TABLE "barber_notas_credito" ADD COLUMN "branchId" INTEGER;

-- ── BACKFILL: Asignar branchId de la casa matriz a registros existentes ─────

UPDATE "barber_appointments" a
SET "branchId" = b.id
FROM "barber_branches" b
WHERE b."tenantId" = a."tenantId" AND b."isHeadquarters" = true;

UPDATE "barber_turnos" t
SET "branchId" = b.id
FROM "barber_branches" b
WHERE b."tenantId" = t."tenantId" AND b."isHeadquarters" = true;

UPDATE "barber_ventas" v
SET "branchId" = b.id
FROM "barber_branches" b
WHERE b."tenantId" = v."tenantId" AND b."isHeadquarters" = true;

UPDATE "barber_gastos" g
SET "branchId" = b.id
FROM "barber_branches" b
WHERE b."tenantId" = g."tenantId" AND b."isHeadquarters" = true;

UPDATE "barber_compras" c
SET "branchId" = b.id
FROM "barber_branches" b
WHERE b."tenantId" = c."tenantId" AND b."isHeadquarters" = true;

UPDATE "barber_planillas" p
SET "branchId" = b.id
FROM "barber_branches" b
WHERE b."tenantId" = p."tenantId" AND b."isHeadquarters" = true;

UPDATE "barber_kardex" k
SET "branchId" = b.id
FROM "barber_branches" b
WHERE b."tenantId" = k."tenantId" AND b."isHeadquarters" = true;

UPDATE "barber_day_overrides" d
SET "branchId" = b.id
FROM "barber_branches" b
WHERE b."tenantId" = d."tenantId" AND b."isHeadquarters" = true;

UPDATE "barber_correlativos" c
SET "branchId" = b.id
FROM "barber_branches" b
WHERE b."tenantId" = c."tenantId" AND b."isHeadquarters" = true;

UPDATE "barber_notas_credito" nc
SET "branchId" = b.id
FROM "barber_branches" b
WHERE b."tenantId" = nc."tenantId" AND b."isHeadquarters" = true;

-- ── BACKFILL: Asignar todos los barberos a la casa matriz ───────────────────

INSERT INTO "barber_branch_assignments" ("branchId", "barberId", "isPrimary")
SELECT b.id, br.id, true
FROM "barbers" br
JOIN "barber_branches" b ON b."tenantId" = br."tenantId" AND b."isHeadquarters" = true;

-- ── Índices en las columnas branchId agregadas ──────────────────────────────

CREATE INDEX "barber_appointments_branchId_idx"  ON "barber_appointments"("branchId");
CREATE INDEX "barber_turnos_branchId_idx"         ON "barber_turnos"("branchId");
CREATE INDEX "barber_ventas_branchId_idx"         ON "barber_ventas"("branchId");
CREATE INDEX "barber_gastos_branchId_idx"         ON "barber_gastos"("branchId");
CREATE INDEX "barber_compras_branchId_idx"        ON "barber_compras"("branchId");
CREATE INDEX "barber_planillas_branchId_idx"      ON "barber_planillas"("branchId");
CREATE INDEX "barber_kardex_branchId_idx"         ON "barber_kardex"("branchId");
CREATE INDEX "barber_day_overrides_branchId_idx"  ON "barber_day_overrides"("branchId");
CREATE INDEX "barber_correlativos_branchId_idx"   ON "barber_correlativos"("branchId");
CREATE INDEX "barber_notas_credito_branchId_idx"  ON "barber_notas_credito"("branchId");

-- ── FKs de branchId en tablas operativas ────────────────────────────────────

ALTER TABLE "barber_appointments"
    ADD CONSTRAINT "barber_appointments_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "barber_branches"("id") ON DELETE SET NULL;

ALTER TABLE "barber_turnos"
    ADD CONSTRAINT "barber_turnos_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "barber_branches"("id") ON DELETE SET NULL;

ALTER TABLE "barber_ventas"
    ADD CONSTRAINT "barber_ventas_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "barber_branches"("id") ON DELETE SET NULL;

ALTER TABLE "barber_gastos"
    ADD CONSTRAINT "barber_gastos_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "barber_branches"("id") ON DELETE SET NULL;

ALTER TABLE "barber_compras"
    ADD CONSTRAINT "barber_compras_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "barber_branches"("id") ON DELETE SET NULL;

ALTER TABLE "barber_planillas"
    ADD CONSTRAINT "barber_planillas_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "barber_branches"("id") ON DELETE SET NULL;

ALTER TABLE "barber_kardex"
    ADD CONSTRAINT "barber_kardex_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "barber_branches"("id") ON DELETE SET NULL;

ALTER TABLE "barber_day_overrides"
    ADD CONSTRAINT "barber_day_overrides_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "barber_branches"("id") ON DELETE SET NULL;

ALTER TABLE "barber_correlativos"
    ADD CONSTRAINT "barber_correlativos_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "barber_branches"("id") ON DELETE SET NULL;

ALTER TABLE "barber_notas_credito"
    ADD CONSTRAINT "barber_notas_credito_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "barber_branches"("id") ON DELETE SET NULL;
