import { createClient } from "@/utils/supabase/server";
import { isValidDateOnlyString } from "@/lib/student-workspace/date";
import { getStudentWorkspaceRotationById } from "@/lib/student-workspace/rotations";
import {
  STUDENT_WORKSPACE_CHECKLIST_TEMPLATE_SCOPES,
  type StudentWorkspaceChecklistItem,
  type StudentWorkspaceChecklistItemInsert,
  type StudentWorkspaceChecklistItemUpdate,
  type StudentWorkspaceChecklistState,
  type StudentWorkspaceChecklistStateUpsert,
  type StudentWorkspaceChecklistTemplate,
  type StudentWorkspaceChecklistTemplateInsert,
  type StudentWorkspaceChecklistTemplateScope,
  type StudentWorkspaceChecklistTemplateUpdate,
} from "@/lib/student-workspace/types";

export const DAILY_SUCCESS_CHECKLIST_TITLE = "Daily Success Checklist";
export const DAILY_SUCCESS_CHECKLIST_ITEMS = [
  "Show up early",
  "Show up prepared",
  "Have a positive attitude",
  "Anticipate what is needed",
] as const;

function normalizeString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function requireLabel(value: string | null | undefined, fieldName: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required.`);
  }
  return trimmed;
}

function requireTemplateScope(value: unknown): StudentWorkspaceChecklistTemplateScope {
  if (
    typeof value !== "string" ||
    !STUDENT_WORKSPACE_CHECKLIST_TEMPLATE_SCOPES.includes(
      value as StudentWorkspaceChecklistTemplateScope
    )
  ) {
    throw new Error("Checklist template scope is invalid.");
  }
  return value as StudentWorkspaceChecklistTemplateScope;
}

async function assertOwnedRotation(userId: string, rotationId: string | null | undefined) {
  if (!rotationId) return null;
  const rotation = await getStudentWorkspaceRotationById(userId, rotationId);
  if (!rotation) {
    throw new Error("Referenced rotation was not found.");
  }
  return rotation.id;
}

export async function getStudentWorkspaceChecklistTemplates(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_checklist_templates")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as StudentWorkspaceChecklistTemplate[];
}

export async function getStudentWorkspaceChecklistItems(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_checklist_items")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as StudentWorkspaceChecklistItem[];
}

export async function getStudentWorkspaceChecklistStateForDate(
  userId: string,
  stateDate: string
) {
  if (!isValidDateOnlyString(stateDate)) {
    throw new Error("date must use valid YYYY-MM-DD format.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_checklist_state")
    .select("*")
    .eq("user_id", userId)
    .eq("state_date", stateDate);

  if (error) throw new Error(error.message);
  return (data ?? []) as StudentWorkspaceChecklistState[];
}

export async function ensureStudentWorkspaceDailySuccessChecklist(userId: string) {
  let templates = await getStudentWorkspaceChecklistTemplates(userId);
  let items = await getStudentWorkspaceChecklistItems(userId);

  let template =
    templates.find(
      (entry) =>
        entry.template_scope === "daily" &&
        entry.title === DAILY_SUCCESS_CHECKLIST_TITLE
    ) ?? null;

  if (!template) {
    template = await createStudentWorkspaceChecklistTemplate(userId, {
      title: DAILY_SUCCESS_CHECKLIST_TITLE,
      description:
        "A daily mindset checklist for becoming the student every team wants back.",
      template_scope: "daily",
      is_default: templates.length === 0,
    });
    templates = [...templates, template];
  }

  const templateItems = items.filter((item) => item.template_id === template.id);

  for (const label of DAILY_SUCCESS_CHECKLIST_ITEMS) {
    const alreadyExists = templateItems.some((item) => item.label === label);
    if (alreadyExists) continue;

    await createStudentWorkspaceChecklistItem(userId, {
      template_id: template.id,
      label,
      details: null,
      is_required: true,
    });
  }

  items = await getStudentWorkspaceChecklistItems(userId);

  return {
    template,
    items: DAILY_SUCCESS_CHECKLIST_ITEMS.map((label) =>
      items.find(
        (item) => item.template_id === template.id && item.label === label
      )
    ).filter(Boolean) as StudentWorkspaceChecklistItem[],
  };
}

export async function createStudentWorkspaceChecklistTemplate(
  userId: string,
  input: Partial<Omit<StudentWorkspaceChecklistTemplateInsert, "user_id">>
) {
  const supabase = await createClient();
  const title = requireLabel(input.title, "Checklist template title");
  const templateScope = requireTemplateScope(input.template_scope);
  const rotationId = await assertOwnedRotation(userId, input.rotation_id);

  const { data: lastTemplate, error: lastTemplateError } = await supabase
    .from("student_workspace_checklist_templates")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastTemplateError) throw new Error(lastTemplateError.message);

  const payload = {
    user_id: userId,
    title,
    description: normalizeString(input.description),
    template_scope: templateScope,
    rotation_id: rotationId,
    is_default: input.is_default ?? false,
    sort_order: (lastTemplate?.sort_order ?? -1) + 1,
  };

  const { data, error } = await supabase
    .from("student_workspace_checklist_templates")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as StudentWorkspaceChecklistTemplate;
}

export async function getStudentWorkspaceChecklistTemplateById(
  userId: string,
  templateId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_checklist_templates")
    .select("*")
    .eq("user_id", userId)
    .eq("id", templateId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as StudentWorkspaceChecklistTemplate | null;
}

export async function updateStudentWorkspaceChecklistTemplate(
  userId: string,
  templateId: string,
  updates: StudentWorkspaceChecklistTemplateUpdate
) {
  const supabase = await createClient();
  const existing = await getStudentWorkspaceChecklistTemplateById(userId, templateId);
  if (!existing) throw new Error("Checklist template not found.");

  const rotationId =
    updates.rotation_id === undefined
      ? existing.rotation_id
      : await assertOwnedRotation(userId, updates.rotation_id);

  const payload = {
    title: updates.title === undefined ? undefined : requireLabel(updates.title, "Checklist template title"),
    description:
      updates.description === undefined
        ? undefined
        : normalizeString(updates.description),
    template_scope:
      updates.template_scope === undefined
        ? undefined
        : requireTemplateScope(updates.template_scope),
    rotation_id: updates.rotation_id === undefined ? undefined : rotationId,
    is_default: updates.is_default,
    archived_at: updates.archived_at === undefined ? undefined : updates.archived_at,
  };

  const { data, error } = await supabase
    .from("student_workspace_checklist_templates")
    .update(payload)
    .eq("user_id", userId)
    .eq("id", templateId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as StudentWorkspaceChecklistTemplate;
}

async function renormalizeChecklistItemOrder(userId: string, templateId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_checklist_items")
    .select("*")
    .eq("user_id", userId)
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  await Promise.all(
    ((data ?? []) as StudentWorkspaceChecklistItem[]).map(async (item, index) => {
      if (item.sort_order === index) return;
      const { error: updateError } = await supabase
        .from("student_workspace_checklist_items")
        .update({ sort_order: index })
        .eq("user_id", userId)
        .eq("id", item.id);
      if (updateError) throw new Error(updateError.message);
    })
  );
}

export async function createStudentWorkspaceChecklistItem(
  userId: string,
  input: Partial<Omit<StudentWorkspaceChecklistItemInsert, "user_id">>
) {
  const supabase = await createClient();
  if (!input.template_id) {
    throw new Error("template_id is required.");
  }
  const template = await getStudentWorkspaceChecklistTemplateById(userId, input.template_id);
  if (!template) {
    throw new Error("Checklist template not found.");
  }

  const { data: lastItem, error: lastItemError } = await supabase
    .from("student_workspace_checklist_items")
    .select("sort_order")
    .eq("user_id", userId)
    .eq("template_id", template.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastItemError) throw new Error(lastItemError.message);

  const payload = {
    user_id: userId,
    template_id: template.id,
    label: requireLabel(input.label, "Checklist item label"),
    details: normalizeString(input.details),
    is_required: input.is_required ?? false,
    sort_order: (lastItem?.sort_order ?? -1) + 1,
  };

  const { data, error } = await supabase
    .from("student_workspace_checklist_items")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as StudentWorkspaceChecklistItem;
}

export async function getStudentWorkspaceChecklistItemById(
  userId: string,
  itemId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_workspace_checklist_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", itemId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as StudentWorkspaceChecklistItem | null;
}

export async function updateStudentWorkspaceChecklistItem(
  userId: string,
  itemId: string,
  updates: StudentWorkspaceChecklistItemUpdate
) {
  const supabase = await createClient();
  const existing = await getStudentWorkspaceChecklistItemById(userId, itemId);
  if (!existing) throw new Error("Checklist item not found.");

  const payload = {
    label:
      updates.label === undefined
        ? undefined
        : requireLabel(updates.label, "Checklist item label"),
    details:
      updates.details === undefined ? undefined : normalizeString(updates.details),
    is_required: updates.is_required,
  };

  const { data, error } = await supabase
    .from("student_workspace_checklist_items")
    .update(payload)
    .eq("user_id", userId)
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as StudentWorkspaceChecklistItem;
}

export async function deleteStudentWorkspaceChecklistTemplate(
  userId: string,
  templateId: string
) {
  const supabase = await createClient();
  const existing = await getStudentWorkspaceChecklistTemplateById(userId, templateId);
  if (!existing) throw new Error("Checklist template not found.");

  const { error } = await supabase
    .from("student_workspace_checklist_templates")
    .delete()
    .eq("user_id", userId)
    .eq("id", templateId);

  if (error) throw new Error(error.message);
  return true;
}

export async function deleteStudentWorkspaceChecklistItem(
  userId: string,
  itemId: string
) {
  const supabase = await createClient();
  const existing = await getStudentWorkspaceChecklistItemById(userId, itemId);
  if (!existing) throw new Error("Checklist item not found.");

  const { error } = await supabase
    .from("student_workspace_checklist_items")
    .delete()
    .eq("user_id", userId)
    .eq("id", itemId);

  if (error) throw new Error(error.message);
  await renormalizeChecklistItemOrder(userId, existing.template_id);
  return true;
}

export async function upsertStudentWorkspaceChecklistState(
  userId: string,
  input: StudentWorkspaceChecklistStateUpsert
) {
  if (!isValidDateOnlyString(input.state_date)) {
    throw new Error("state_date must use valid YYYY-MM-DD format.");
  }

  const item = await getStudentWorkspaceChecklistItemById(userId, input.checklist_item_id);
  if (!item) {
    throw new Error("Checklist item not found.");
  }

  const supabase = await createClient();
  const payload = {
    user_id: userId,
    checklist_item_id: item.id,
    state_date: input.state_date,
    is_completed: input.is_completed,
    completed_at: input.is_completed ? new Date().toISOString() : null,
    notes: normalizeString(input.notes),
  };

  const { data, error } = await supabase
    .from("student_workspace_checklist_state")
    .upsert(payload, {
      onConflict: "user_id,checklist_item_id,state_date",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as StudentWorkspaceChecklistState;
}
