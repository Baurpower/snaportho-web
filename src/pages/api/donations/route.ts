// app/api/donations/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If you're on a provider that requires SSL in prod:
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

type Row = {
  billing_name: string | null;
  display_name: string | null;
  anonymous: boolean | null;
  message: string | null;
  amount: number; // cents (Stripe PI amount)
  stripe_id: string;
  status: string;
  created_at: Date | string | null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 200);

    // IMPORTANT:
    // - This assumes you have a created_at column (recommended).
    // - If not, add it (DEFAULT now()) or change ORDER BY to whatever you do have.
    const client = await pool.connect();
    try {
      const listRes = await client.query<Row>(
        `
        SELECT
          billing_name,
          display_name,
          anonymous,
          message,
          amount,
          stripe_id,
          status,
          created_at
        FROM donations
        WHERE status = 'paid'
        ORDER BY created_at DESC NULLS LAST
        LIMIT $1
        `,
        [limit]
      );

      const totalsRes = await client.query<{ sum_cents: string | null; count: string }>(
        `
        SELECT
          COALESCE(SUM(amount), 0) AS sum_cents,
          COUNT(*)::text AS count
        FROM donations
        WHERE status = 'paid'
        `
      );

      const sumCents = Number(totalsRes.rows?.[0]?.sum_cents ?? 0);
      const count = Number(totalsRes.rows?.[0]?.count ?? 0);

      // Shape to match your client Donation type
      const donations = listRes.rows.map((r) => {
        const isAnon = !!r.anonymous || !(r.display_name ?? "").trim();

        return {
          // Send blank name when anonymous so your codename logic runs client-side
          name: isAnon ? "" : (r.display_name ?? "").trim(),
          amount: Math.round((Number(r.amount) || 0) / 100), // dollars for your UI
          dateISO: r.created_at ? new Date(r.created_at).toISOString() : "",
          via: "Stripe" as const,
          note: (r.message ?? "").trim() || undefined,
          // highlight: optional - you can compute client-side if you want
        };
      });

      return NextResponse.json({
        donations,
        totals: {
          sumCents,
          sumDollars: Math.round(sumCents / 100),
          count,
        },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("GET /api/donations error:", err);
    return NextResponse.json({ error: "Failed to load donations" }, { status: 500 });
  }
}