import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { supabaseKey, supabaseUrl } from "./config";

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
