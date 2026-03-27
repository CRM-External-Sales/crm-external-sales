import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl!,
  supabaseAnonKey!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
);

// Evita error en cliente: SERVICE_ROLE no existe en el navegador.
const adminKey =
  typeof window === "undefined"
    ? process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
    : supabaseAnonKey;

export const supabaseAdmin = createClient(
  supabaseUrl!,
  adminKey!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
