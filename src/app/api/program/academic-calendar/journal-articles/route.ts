import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  WorkspacePermissionError,
  requireWorkspacePermission,
} from "@/lib/workspace/access-control";
import { z } from "zod";

const CreateArticlePresenterSchema = z.object({
  roster_id: z.string().uuid().nullable().optional(),
  external_person_id: z.string().uuid().nullable().optional(),
  role: z.string().optional(),
  display_order: z.number().int().optional(),
});

const CreateAcademicJournalArticleSchema = z.object({
  academic_event_id: z.string().uuid(),
  academic_event_session_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1, "Article title is required"),
  journal: z.string().nullable().optional(),
  authors: z.string().nullable().optional(),
  publication_year: z.number().int().nullable().optional(),
  doi: z.string().nullable().optional(),
  pubmed_url: z.string().url().nullable().optional(),
  article_url: z.string().url().nullable().optional(),
  pdf_url: z.string().url().nullable().optional(),
  citation_text: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  key_points: z.string().nullable().optional(),
  discussion_questions: z.string().nullable().optional(),
  display_order: z.number().int().optional(),
  presenters: z.array(CreateArticlePresenterSchema).optional(),
});

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      data: null,
      error: message,
    },
    { status }
  );
}

async function getProgramIdForJournalArticleLookup(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  eventId?: string | null;
  sessionId?: string | null;
}) {
  if (params.eventId) {
    const { data, error } = await params.supabase
      .from("academic_events")
      .select("program_id")
      .eq("id", params.eventId)
      .maybeSingle();

    if (error || !data?.program_id) {
      throw new Error("Academic event not found");
    }

    return data.program_id as string;
  }

  if (params.sessionId) {
    const { data, error } = await params.supabase
      .from("academic_event_sessions")
      .select("academic_event_id, event:academic_events!inner(program_id)")
      .eq("id", params.sessionId)
      .maybeSingle();

    const event = Array.isArray(data?.event) ? data.event[0] : data?.event;
    const programId = event?.program_id;

    if (error || !programId) {
      throw new Error("Academic event session not found");
    }

    return programId as string;
  }

  throw new Error("Missing eventId or sessionId");
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonError("Unauthorized", 401);
    }

    const searchParams = request.nextUrl.searchParams;

    const eventId = searchParams.get("eventId");
    const sessionId = searchParams.get("sessionId");

    if (!eventId && !sessionId) {
      return jsonError("Missing eventId or sessionId", 400);
    }

    const programId = await getProgramIdForJournalArticleLookup({
      supabase,
      eventId,
      sessionId,
    });

    await requireWorkspacePermission({
      userId: user.id,
      programId,
      permission: "canViewAcademicCalendar",
      allowUnlinkedRoster: true,
    });

    let query = supabase
      .from("academic_journal_articles")
      .select(`
        id,
        academic_event_id,
        academic_event_session_id,
        title,
        journal,
        authors,
        publication_year,
        doi,
        pubmed_url,
        article_url,
        pdf_url,
        citation_text,
        summary,
        key_points,
        discussion_questions,
        display_order,
        created_at,
        updated_at,

        presenters:academic_article_presenters (
          id,
          role,
          display_order,

          roster:program_roster (
            id,
            first_name,
            last_name,
            full_name,
            role,
            grad_year
          ),

          external_person:external_people (
            id,
            first_name,
            last_name,
            full_name,
            credentials,
            institution
          )
        )
      `)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (eventId) {
      query = query.eq("academic_event_id", eventId);
    }

    if (sessionId) {
      query = query.eq("academic_event_session_id", sessionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching journal articles:", error);
      return jsonError("Failed to fetch journal articles", 500);
    }

    return NextResponse.json({
      data,
      error: null,
    });
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return jsonError(error.message, error.status);
    }

    console.error("Unexpected journal articles GET error:", error);
    return jsonError("Failed to fetch journal articles", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonError("Unauthorized", 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    const parsed = CreateAcademicJournalArticleSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "Invalid request",
        400
      );
    }

    const article = parsed.data;

    const invalidPresenter = article.presenters?.find(
      (presenter) =>
        !presenter.roster_id && !presenter.external_person_id
    );

    if (invalidPresenter) {
      return jsonError(
        "Each presenter must include either roster_id or external_person_id",
        400
      );
    }

    const programId = await getProgramIdForJournalArticleLookup({
      supabase,
      eventId: article.academic_event_id,
    });

    await requireWorkspacePermission({
      userId: user.id,
      programId,
      permission: "canEditAcademicEvents",
      allowUnlinkedRoster: true,
    });

    const { data: createdArticle, error: articleError } = await supabase
      .from("academic_journal_articles")
      .insert({
        academic_event_id: article.academic_event_id,
        academic_event_session_id:
          article.academic_event_session_id ?? null,
        title: article.title,
        journal: article.journal ?? null,
        authors: article.authors ?? null,
        publication_year: article.publication_year ?? null,
        doi: article.doi ?? null,
        pubmed_url: article.pubmed_url ?? null,
        article_url: article.article_url ?? null,
        pdf_url: article.pdf_url ?? null,
        citation_text: article.citation_text ?? null,
        summary: article.summary ?? null,
        key_points: article.key_points ?? null,
        discussion_questions: article.discussion_questions ?? null,
        display_order: article.display_order ?? 0,
      })
      .select(`
        id,
        academic_event_id,
        academic_event_session_id,
        title,
        journal,
        authors,
        publication_year,
        doi,
        pubmed_url,
        article_url,
        pdf_url,
        citation_text,
        summary,
        key_points,
        discussion_questions,
        display_order,
        created_at,
        updated_at
      `)
      .single();

    if (articleError || !createdArticle) {
      console.error("Error creating journal article:", articleError);
      return jsonError("Failed to create journal article", 500);
    }

    if (article.presenters && article.presenters.length > 0) {
      const presenterRows = article.presenters.map((presenter, index) => ({
        article_id: createdArticle.id,
        roster_id: presenter.roster_id ?? null,
        external_person_id: presenter.external_person_id ?? null,
        role: presenter.role ?? "presenter",
        display_order: presenter.display_order ?? index,
      }));

      const { error: presenterError } = await supabase
        .from("academic_article_presenters")
        .insert(presenterRows);

      if (presenterError) {
        console.error("Error creating article presenters:", presenterError);
        return jsonError(
          "Article was created, but presenters failed to save",
          500
        );
      }
    }

    const { data, error } = await supabase
      .from("academic_journal_articles")
      .select(`
        id,
        academic_event_id,
        academic_event_session_id,
        title,
        journal,
        authors,
        publication_year,
        doi,
        pubmed_url,
        article_url,
        pdf_url,
        citation_text,
        summary,
        key_points,
        discussion_questions,
        display_order,
        created_at,
        updated_at,

        presenters:academic_article_presenters (
          id,
          role,
          display_order,

          roster:program_roster (
            id,
            first_name,
            last_name,
            full_name,
            role,
            grad_year
          ),

          external_person:external_people (
            id,
            first_name,
            last_name,
            full_name,
            credentials,
            institution
          )
        )
      `)
      .eq("id", createdArticle.id)
      .single();

    if (error) {
      console.error("Error fetching created journal article:", error);
      return jsonError("Journal article created but failed to reload", 500);
    }

    return NextResponse.json({
      data,
      error: null,
    });
  } catch (error) {
    if (error instanceof WorkspacePermissionError) {
      return jsonError(error.message, error.status);
    }

    console.error("Unexpected journal articles POST error:", error);
    return jsonError("Failed to create journal article", 500);
  }
}
