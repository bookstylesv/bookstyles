-- CreateTable
CREATE TABLE "barber_plan_configs" (
    "id" SERIAL NOT NULL,
    "plan" "BarberPlan" NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "maxBarbers" INTEGER NOT NULL DEFAULT 3,
    "maxBranches" INTEGER NOT NULL DEFAULT 1,
    "modules" JSONB NOT NULL DEFAULT '{}',
    "price" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barber_plan_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barber_plan_configs_plan_key" ON "barber_plan_configs"("plan");

-- Seed default plan configs
INSERT INTO "barber_plan_configs" ("plan", "displayName", "description", "maxBarbers", "maxBranches", "modules", "updatedAt")
VALUES
  ('TRIAL', 'Trial', 'Prueba gratuita por 30 días', 3, 2,
   '{"appointments":true,"pos":true,"clients":true,"products":false,"expenses":false,"reports_basic":false,"accounts_receivable":false,"payroll":false,"billing_dte":false,"reports_advanced":false,"branches":false,"api_integrations":false,"loyalty":false}',
   CURRENT_TIMESTAMP),
  ('BASIC', 'Básico', 'Plan básico para negocios pequeños', 5, 1,
   '{"appointments":true,"pos":true,"clients":true,"products":true,"expenses":true,"reports_basic":true,"accounts_receivable":false,"payroll":false,"billing_dte":false,"reports_advanced":false,"branches":false,"api_integrations":false,"loyalty":false}',
   CURRENT_TIMESTAMP),
  ('PRO', 'Profesional', 'Plan profesional con módulos avanzados', 10, 3,
   '{"appointments":true,"pos":true,"clients":true,"products":true,"expenses":true,"reports_basic":true,"accounts_receivable":true,"payroll":true,"billing_dte":true,"reports_advanced":true,"branches":true,"api_integrations":false,"loyalty":true}',
   CURRENT_TIMESTAMP),
  ('ENTERPRISE', 'Empresarial', 'Plan completo sin restricciones', 999, 10,
   '{"appointments":true,"pos":true,"clients":true,"products":true,"expenses":true,"reports_basic":true,"accounts_receivable":true,"payroll":true,"billing_dte":true,"reports_advanced":true,"branches":true,"api_integrations":true,"loyalty":true}',
   CURRENT_TIMESTAMP);
