-- ============================================================================
-- Post-migration lint fixes (from mcp__supabase__get_advisors / the
-- Management API's /advisors/security endpoint).
--
-- Fixed here:
--  - function_search_path_mutable on set_updated_at() — pin search_path so
--    the trigger function can't be tricked by a session-level search_path
--    change into resolving objects from an unexpected schema.
--
-- Deliberately left as accepted WARNs (not bugs, just worth recording why):
--  - anon/authenticated_security_definer_function_executable on is_admin() —
--    PostgREST auto-exposes every public-schema function as an RPC
--    endpoint, so anon *can* call is_admin() directly. It's harmless (a
--    read-only lookup that returns false for anon, since auth.uid() is
--    null) and, more importantly, anon *must* retain EXECUTE on it because
--    it's referenced inside RLS policies that apply to the anon role
--    (`using (visible or is_admin())`) — Postgres evaluates policy
--    expressions with the querying role's privileges, so revoking EXECUTE
--    would break those policies, not just the direct RPC path. The proper
--    fix (move is_admin() into a schema PostgREST doesn't expose) means
--    dropping and recreating every policy that references it — a
--    reasonable follow-up if this project ever needs air-tight hardening,
--    but not warranted for a single-owner portfolio site today.
--  - public_bucket_allows_listing on the "media" bucket — the bucket only
--    ever holds intentionally-public marketing assets (gallery photos, blog
--    covers); being able to list filenames in it isn't a meaningful
--    exposure the way it would be for a bucket with any private content.
-- ============================================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
