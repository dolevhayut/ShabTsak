-- Fix rpc_auto_assign for environments that block DELETE without WHERE.
-- Replaces temp-table cleanup from DELETE to TRUNCATE.

DO $$
DECLARE
  v_def TEXT;
BEGIN
  SELECT pg_get_functiondef(
    'public.rpc_auto_assign(text,text,integer,bigint,bigint,integer[])'::regprocedure
  )
  INTO v_def;

  v_def := replace(
    v_def,
    'DELETE FROM _auto_assign_candidates;',
    'TRUNCATE TABLE _auto_assign_candidates;'
  );

  EXECUTE v_def;
END
$$;
