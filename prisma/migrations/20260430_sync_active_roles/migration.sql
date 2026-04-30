-- Sync active roles across barber-pro, speeddan-control-v3 and public booking.
-- Active roles: OWNER, SUPERADMIN, GERENTE, USERS, CLIENT, BARBER.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'BarberUserRole'
      AND e.enumlabel = 'BARBER'
  ) THEN
    ALTER TYPE "BarberUserRole" ADD VALUE 'BARBER';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'BarberUserRole'
      AND e.enumlabel = 'USUARIO'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'BarberUserRole'
      AND e.enumlabel = 'USERS'
  ) THEN
    ALTER TYPE "BarberUserRole" RENAME VALUE 'USUARIO' TO 'USERS';
  END IF;
END $$;
