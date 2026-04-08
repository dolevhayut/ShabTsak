-- Drop old overloads of rpc_create_shibuts and rpc_update_shibuts
-- that lacked p_start_minute / p_end_minute (added in migration 010).
-- PostgREST returns 404 when both overloads exist and the client sends the
-- newer parameters, because it cannot disambiguate the call.

DROP FUNCTION IF EXISTS public.rpc_create_shibuts(TEXT, TEXT, INT, INT, INT, INT, BIGINT);
DROP FUNCTION IF EXISTS public.rpc_update_shibuts(TEXT, TEXT, INT, INT, INT, INT, INT, BIGINT);
