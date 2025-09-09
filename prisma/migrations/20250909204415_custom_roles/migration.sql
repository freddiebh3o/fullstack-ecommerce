-- Convert enum -> text IN PLACE (preserves data)
ALTER TABLE "public"."Role"
  ALTER COLUMN "key" TYPE TEXT USING ("key"::text);

-- Add new columns
ALTER TABLE "public"."Role"
  ADD COLUMN "builtin" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "description" TEXT;

-- Ensure the unique index exists (won’t fail if it already does)
CREATE UNIQUE INDEX IF NOT EXISTS "Role_tenantId_key_key"
  ON "public"."Role"("tenantId", "key");

-- Drop the old enum type if it’s no longer used
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoleKey') THEN
    DROP TYPE "RoleKey";
  END IF;
END$$;
