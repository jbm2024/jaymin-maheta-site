import { createClient } from "@supabase/supabase-js";

// Publishable key — safe to expose client-side; every table it can reach is
// gated by Postgres RLS (see assets/supabase/002_rls.sql), not by keeping
// this key secret.
const SUPABASE_URL = "https://mkuoqkyvgexcxxylxvbc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_9HJ_IJxgRTvTUGqE8NdGPw_gZ8zXMOa";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
