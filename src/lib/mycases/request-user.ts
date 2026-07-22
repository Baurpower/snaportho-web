import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
export async function requireMyCasesApiUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  return { user };
}
