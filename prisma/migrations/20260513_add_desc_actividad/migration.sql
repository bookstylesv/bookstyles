-- AddColumn: descActividad a barber_users
ALTER TABLE "barber_users" ADD COLUMN IF NOT EXISTS "descActividad" TEXT;
