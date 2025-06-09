// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  // replace these with your actual project values
  "https://geznczcokbgybsseipjg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdlem5jemNva2JneWJzc2VpcGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMTQyMzQsImV4cCI6MjA2NDg5MDIzNH0.lUx0_kkp9zrqq9rZq6JIRogveyeUSOJ7P87wJUxv9P0"
);