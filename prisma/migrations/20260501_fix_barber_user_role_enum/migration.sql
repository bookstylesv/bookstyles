-- Ensure the production BarberUserRole enum matches the roles used by the apps.
-- Some databases had USUARIO before the shared role name was changed to USERS.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'BarberUserRole'
      AND e.enumlabel = 'SUPERADMIN'
  ) THEN
    ALTER TYPE "BarberUserRole" ADD VALUE 'SUPERADMIN';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'BarberUserRole'
      AND e.enumlabel = 'GERENTE'
  ) THEN
    ALTER TYPE "BarberUserRole" ADD VALUE 'GERENTE';
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
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'BarberUserRole'
      AND e.enumlabel = 'USERS'
  ) THEN
    ALTER TYPE "BarberUserRole" ADD VALUE 'USERS';
  END IF;
END $$;

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
  AND EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'BarberUserRole'
      AND e.enumlabel = 'USERS'
  ) THEN
    UPDATE "barber_users"
    SET "role" = 'USERS'::"BarberUserRole"
    WHERE "role"::text = 'USUARIO';
  END IF;
END $$;
