-- ============================================
-- Security fix: remove open anon read on camps
-- Replace with identity-verified RPC
-- ============================================

-- Step 1: drop the open camps_anon_read policy
DROP POLICY IF EXISTS "camps_anon_read" ON public.camps;

-- Step 2: RPC that returns only camps the caller is linked to
CREATE OR REPLACE FUNCTION public.rpc_get_my_camps(
  p_user_id TEXT,
  p_phone   TEXT
) RETURNS TABLE (
  id                INT,
  name              TEXT,
  registration_code TEXT,
  created_at        TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Verify identity (raises AUTH_FAILED if not valid)
  PERFORM public.verify_user(p_user_id, p_phone);

  RETURN QUERY
    SELECT c.id, c.name, c.registration_code, c.created_at
    FROM   public.camps c
    JOIN   public.user_guard_links ugl ON ugl."campId" = c.id
    WHERE  ugl."userId" = p_user_id;
END;
$$;

-- Allow anon to call this RPC (identity is verified inside)
REVOKE ALL  ON FUNCTION public.rpc_get_my_camps(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_my_camps(TEXT, TEXT) TO anon;
