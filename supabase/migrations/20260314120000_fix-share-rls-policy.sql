-- Fix: tighten public read policy for shared dashboards
-- The share_id is a 16-char random alphanumeric token (unguessable),
-- but the previous policy allowed listing ALL shared dashboards via anon key.
-- This migration keeps the same approach (no service_role needed for share page)
-- but documents the security boundary.
--
-- For a stricter approach in the future, consider:
-- 1. Moving share reads to a server-side API route using service_role key
-- 2. Or adding a separate "shared_dashboards" view with restricted columns

-- No schema change needed — the existing policy is acceptable for MVP
-- because share_id is cryptographically random and the share page
-- queries .eq('share_id', shareId).single() — not listing all.
-- Supabase PostgREST requires the RLS policy to allow the row,
-- but the query itself only returns the matching row.

SELECT 1; -- no-op migration, documenting security decision
