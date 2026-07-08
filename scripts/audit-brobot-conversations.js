const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    let value = trimmed.slice(idx + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function truncate(value, length = 2200) {
  const clean = text(value).replace(/\s+/g, ' ');
  return clean.length <= length ? clean : `${clean.slice(0, length)}...`;
}

function classifyPrompt(prompt) {
  const lower = prompt.toLowerCase();
  if (/\b(oite|board|boards|test|quiz|distractor)\b/.test(lower)) return 'OITE';
  if (/\b(anatomy|nerve|artery|blood supply|muscle|attach|innervation|danger zone)\b/.test(lower)) return 'anatomy';
  if (/\b(fracture|orif|dislocation|nonunion|malunion|fixation|classification)\b/.test(lower)) return 'fracture';
  if (/\b(approach|portal|incision|arthroscopy|arthroplasty|reconstruction|release|operative|surgery|surgical|scrub|case tomorrow|attending)\b/.test(lower)) return 'surgical/attending-prep';
  if (/\b(clinic|workup|differential|exam|xray|x-ray|mri|treatment|nonoperative)\b/.test(lower)) return 'clinic';
  if (/\b(research|paper|study|abstract|methods|results|journal|evidence|systematic)\b/.test(lower)) return 'research';
  if (/\b(what is|explain|teach|basics|overview|intro)\b/.test(lower)) return 'beginner';
  return 'general';
}

function deriveHeuristics(answer, structured) {
  const combined = [
    answer,
    ...asArray(structured?.priorityPoints),
    ...asArray(structured?.knowledgeGaps),
    ...asArray(structured?.whatMostResidentsMiss),
  ].join(' ');
  const lower = combined.toLowerCase();
  const hasNamedSpecifics = /\b(hawkins|garden|pauwels|laugehansen|weber|schatzker|neer|salter|harris|gustilo|ao\/ota|kocher|fcr|pq|watershed|radial artery|median nerve|axillary nerve|sciatic|avascular|avn|ct|mri|ap|lateral|mortise|fluoro|reduction|implant|plate|nail|screw|portal|interval|approach)\b/.test(lower);
  const hasReasoning = /\b(because|therefore|so that|why|drives|changes|pivot|threshold|if .* then|decision|tradeoff|indication|contraindication)\b/.test(lower);
  const hasPearls = /\b(attending|resident|miss|pitfall|trap|pearl|avoid|bailout|what matters|will ask|classic)\b/.test(lower);
  const genericFillerHits = [
    'depends on patient factors',
    'depends on several factors',
    'individualized',
    'multidisciplinary',
    'consult your attending',
    'broad overview',
    'key points include',
  ].filter((phrase) => lower.includes(phrase));
  return { hasNamedSpecifics, hasReasoning, hasPearls, genericFillerHits };
}

async function fetchCorpus(client) {
  const conversations = await client.query(`
    select id, created_at, updated_at, last_mode, detected_context
    from public.brobot_conversations
    order by created_at asc
  `);
  const messages = await client.query(`
    select id, conversation_id, role, content, structured_json, mode, response_depth, created_at
    from public.brobot_messages
    order by conversation_id asc, created_at asc
  `);
  const usage = await client.query(`
    select event_type, count(*)::int as count
    from public.brobot_usage_events
    where event_type is not null and event_type like 'brobot%'
    group by event_type
    order by count desc
  `);
  const focusEvents = await client.query(`
    select
      count(*) filter (where event_type = 'brobot_chat_clarification_suggested')::int as clarifications_suggested,
      count(*) filter (where event_type = 'brobot_chat_branch_selection_prompted')::int as branch_prompts,
      count(*) filter (where event_type = 'brobot_chat_message')::int as chat_messages,
      count(*) filter (where event_type = 'brobot_chat_completed')::int as chat_completed
    from public.brobot_usage_events
  `);
  const branchEvents = await client.query(`
    select
      count(*)::int as events,
      count(*) filter (where clicked)::int as clicks,
      count(distinct conversation_id)::int as conversations,
      count(*) filter (where generated_followup)::int as generated_followups
    from public.branch_events
  `);
  const branchByQuestion = await client.query(`
    select
      coalesce(bq.question_text, '(unknown)') as question_text,
      coalesce(bq.category, '(unknown)') as category,
      count(be.id)::int as impressions,
      count(be.id) filter (where be.clicked)::int as clicks
    from public.branch_events be
    left join public.branch_questions bq on bq.id = be.branch_question_id
    group by 1,2
    order by impressions desc, clicks desc
    limit 50
  `);
  return {
    conversations: conversations.rows,
    messages: messages.rows,
    usageEvents: usage.rows,
    focusEvents: focusEvents.rows[0],
    branchEvents: branchEvents.rows[0],
    branchByQuestion: branchByQuestion.rows,
  };
}

function buildTurns(corpus) {
  const convoIndex = new Map(corpus.conversations.map((conv, idx) => [conv.id, { ...conv, auditId: `C${String(idx + 1).padStart(3, '0')}` }]));
  const byConversation = new Map();
  for (const message of corpus.messages) {
    if (!byConversation.has(message.conversation_id)) byConversation.set(message.conversation_id, []);
    byConversation.get(message.conversation_id).push(message);
  }

  const turns = [];
  for (const [conversationId, messages] of byConversation.entries()) {
    let lastUser = null;
    let turnNumber = 0;
    for (const message of messages) {
      if (message.role === 'user') {
        lastUser = message;
      } else if (message.role === 'assistant' && lastUser) {
        turnNumber += 1;
        const structured = message.structured_json || {};
        turns.push({
          auditId: `${convoIndex.get(conversationId)?.auditId ?? conversationId}:T${turnNumber}`,
          conversationAuditId: convoIndex.get(conversationId)?.auditId ?? conversationId,
          conversationId,
          userMessageId: lastUser.id,
          assistantMessageId: message.id,
          createdAt: message.created_at,
          mode: message.mode || structured.detectedMode || 'unknown',
          responseDepth: message.response_depth,
          promptCategory: classifyPrompt(lastUser.content),
          userPrompt: lastUser.content,
          answer: message.content,
          structured,
          clarifyingQuestions: asArray(structured.clarifyingQuestions).map(text).filter(Boolean),
          suggestedQuestions: asArray(structured.suggestedQuestions).map(text).filter(Boolean),
          nextLearningBranches: asArray(structured.nextLearningBranches),
          needsClarification: Boolean(structured.needsClarification),
          selectedFocus: text(structured.selectedFocus),
          assumedContext: text(structured.assumedContext),
          priorityPoints: asArray(structured.priorityPoints).map(text).filter(Boolean),
          knowledgeGaps: asArray(structured.knowledgeGaps).map(text).filter(Boolean),
          whatMostResidentsMiss: asArray(structured.whatMostResidentsMiss).map(text).filter(Boolean),
          heuristics: deriveHeuristics(message.content, structured),
        });
      }
    }
  }
  return turns;
}

async function scoreTurns(turns) {
  return turns.map((turn) => ({ ...turn, audit: localScoreTurn(turn) }));
}

function clampScore(value) {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function localScoreTurn(turn) {
  const answer = text(turn.answer);
  const lower = answer.toLowerCase();
  const wordCount = answer.split(/\s+/).filter(Boolean).length;
  const structuredCount =
    turn.priorityPoints.length +
    turn.knowledgeGaps.length +
    turn.whatMostResidentsMiss.length;
  const failureLabels = [];

  if (!turn.heuristics.hasNamedSpecifics) failureLabels.push('low_specificity');
  if (!turn.heuristics.hasReasoning) failureLabels.push('weak_decision_making');
  if (!turn.heuristics.hasPearls) failureLabels.push('missing_attending_pearls');
  if (turn.heuristics.genericFillerHits.length) failureLabels.push('generic_filler');
  if (wordCount < 90) failureLabels.push('too_shallow');
  if (wordCount > 850) failureLabels.push('too_verbose');
  if (turn.promptCategory === 'surgical/attending-prep' && !/\b(interval|approach|exposure|portal|incision|anatomy|pitfall|fluoro|reduction|implant|bailout|position)\b/i.test(answer)) {
    failureLabels.push('weak_surgical_teaching');
  }
  if (turn.promptCategory === 'fracture' && !/\b(classification|unstable|stability|operative|nonoperative|reduction|fixation|implant|ct|pattern)\b/i.test(answer)) {
    failureLabels.push('weak_fracture_framework');
  }
  if (turn.promptCategory === 'clinic' && !/\b(history|exam|imaging|x-ray|mri|red flag|differential|first-line|indication)\b/i.test(answer)) {
    failureLabels.push('weak_clinic_algorithm');
  }
  if (turn.promptCategory === 'OITE' && !/\b(trap|distractor|classic|stem|threshold|wrong|test|board|algorithm)\b/i.test(answer)) {
    failureLabels.push('weak_oite_explanation');
  }
  if (turn.promptCategory === 'anatomy' && !/\b(course|branch|interval|innerv|supply|at risk|danger|injury|surgical)\b/i.test(answer)) {
    failureLabels.push('generic_anatomy');
  }
  if ((turn.needsClarification || turn.clarifyingQuestions.length > 0) && /^(what is|what are|explain|teach me|blood supply|classification|muscles attach|hawkins)/i.test(turn.userPrompt.trim())) {
    failureLabels.push('over_clarification');
  }
  if (turn.suggestedQuestions.length && turn.suggestedQuestions.every((q) => q.length < 55) && new Set(turn.suggestedQuestions.map((q) => q.toLowerCase().replace(/\W+/g, ' ').trim())).size < turn.suggestedQuestions.length) {
    failureLabels.push('poor_followups');
  }

  const specificity = clampScore(4 + (turn.heuristics.hasNamedSpecifics ? 3 : 0) + (structuredCount >= 8 ? 1 : 0) - turn.heuristics.genericFillerHits.length);
  const depth = clampScore(4 + (turn.heuristics.hasReasoning ? 2 : 0) + (turn.heuristics.hasPearls ? 1 : 0) + (wordCount > 220 ? 1 : 0) - (wordCount < 100 ? 2 : 0));
  const actionability = clampScore(4 + (/\b(do|check|order|ask|look|avoid|present|obtain|confirm|document|reduce|splint|template)\b/i.test(answer) ? 2 : 0) + (turn.priorityPoints.length >= 3 ? 1 : 0));
  const conversationQuality = clampScore(5 + (turn.suggestedQuestions.length >= 3 || turn.nextLearningBranches.length >= 3 ? 1 : 0) + (turn.knowledgeGaps.length >= 2 ? 1 : 0) - (failureLabels.includes('poor_followups') ? 2 : 0));
  const educationalQuality = clampScore((specificity + depth + actionability + conversationQuality) / 4 + (turn.heuristics.hasPearls ? 0.5 : 0) - (failureLabels.length >= 4 ? 1 : 0));
  const hallucinationRisk = /\bcitation|study|trial|guideline|aaos|rockwood|campbell|miller|evidence shows|percent|%\b/i.test(answer) && !/\buncertain|verify|source|provided\b/i.test(answer)
    ? 'moderate'
    : 'low';
  const orthopaedicAccuracy = failureLabels.includes('weak_surgical_teaching') || failureLabels.includes('weak_fracture_framework')
    ? 'concerns'
    : 'approve';
  const focusModeQuality = turn.clarifyingQuestions.length === 0
    ? 'not_applicable'
    : failureLabels.includes('over_clarification')
      ? 'unnecessary_delay'
      : turn.userPrompt.length < 45 || /\bconsult|prep|study tonight|clinic tomorrow|case tomorrow|pain|workup\b/i.test(turn.userPrompt)
        ? 'useful'
        : 'not_applicable';
  const rewritePriority = educationalQuality <= 4 || orthopaedicAccuracy === 'unsafe_or_wrong'
    ? 'P0'
    : educationalQuality <= 6 || failureLabels.length >= 3
      ? 'P1'
      : educationalQuality <= 7
        ? 'P2'
        : 'none';

  return {
    educationalQuality,
    orthopaedicAccuracy,
    specificity,
    depth,
    actionability,
    hallucinationRisk,
    conversationQuality,
    focusModeQuality,
    failureLabels,
    oneLineAssessment: failureLabels.length
      ? `Local audit flags: ${failureLabels.slice(0, 4).join(', ')}.`
      : 'Local audit did not flag major structural quality issues.',
    rewritePriority,
  };
}

function summarize(scored, corpus) {
  const assistantTurns = scored.length;
  const by = (keyFn) => {
    const map = new Map();
    for (const turn of scored) {
      const key = keyFn(turn);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));
  };
  const avg = (field) => {
    const values = scored.map((turn) => Number(turn.audit?.[field])).filter((value) => Number.isFinite(value));
    return values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : null;
  };
  const labels = new Map();
  for (const turn of scored) {
    for (const label of asArray(turn.audit?.failureLabels)) {
      labels.set(label, (labels.get(label) || 0) + 1);
    }
  }
  const clarificationTurns = scored.filter((turn) => turn.needsClarification || turn.clarifyingQuestions.length > 0);
  const overClarified = scored.filter((turn) => turn.audit?.focusModeQuality === 'unnecessary_delay' || turn.audit?.focusModeQuality === 'annoying');
  const usefulClarified = scored.filter((turn) => turn.audit?.focusModeQuality === 'useful');
  const branchEvents = corpus.branchEvents || {};
  return {
    corpus: {
      conversations: corpus.conversations.length,
      messages: corpus.messages.length,
      assistantTurns,
      dateRange: {
        firstConversation: corpus.conversations[0]?.created_at,
        lastConversation: corpus.conversations[corpus.conversations.length - 1]?.created_at,
      },
    },
    scores: {
      educationalQuality: avg('educationalQuality'),
      specificity: avg('specificity'),
      depth: avg('depth'),
      actionability: avg('actionability'),
      conversationQuality: avg('conversationQuality'),
    },
    distributions: {
      byMode: by((turn) => turn.mode),
      byPromptCategory: by((turn) => turn.promptCategory),
      orthopaedicAccuracy: by((turn) => turn.audit?.orthopaedicAccuracy || 'unscored'),
      hallucinationRisk: by((turn) => turn.audit?.hallucinationRisk || 'unscored'),
      rewritePriority: by((turn) => turn.audit?.rewritePriority || 'unscored'),
      failureLabels: [...labels.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count })),
    },
    focusMode: {
      turnsWithClarifyingQuestions: clarificationTurns.length,
      usefulClarificationTurns: usefulClarified.length,
      overClarifiedTurns: overClarified.length,
      structuredClarificationRate: assistantTurns ? Number((clarificationTurns.length / assistantTurns).toFixed(3)) : 0,
      overClarificationRate: assistantTurns ? Number((overClarified.length / assistantTurns).toFixed(3)) : 0,
      usageEvents: corpus.focusEvents,
      branchEvents,
      branchCtr: branchEvents.events ? Number((branchEvents.clicks / branchEvents.events).toFixed(3)) : 0,
    },
    topBranchQuestions: corpus.branchByQuestion,
    topFailures: scored
      .filter((turn) => turn.audit && turn.audit.rewritePriority !== 'none')
      .sort((a, b) => (a.audit.educationalQuality || 99) - (b.audit.educationalQuality || 99))
      .slice(0, 50)
      .map((turn) => ({
        auditId: turn.auditId,
        mode: turn.mode,
        promptCategory: turn.promptCategory,
        userPrompt: truncate(turn.userPrompt, 300),
        answerSnippet: truncate(turn.answer, 500),
        scores: {
          educationalQuality: turn.audit.educationalQuality,
          specificity: turn.audit.specificity,
          depth: turn.audit.depth,
          actionability: turn.audit.actionability,
          conversationQuality: turn.audit.conversationQuality,
        },
        orthopaedicAccuracy: turn.audit.orthopaedicAccuracy,
        hallucinationRisk: turn.audit.hallucinationRisk,
        failureLabels: turn.audit.failureLabels,
        assessment: turn.audit.oneLineAssessment,
      })),
  };
}

async function main() {
  loadEnv();
  const outDir = path.join(process.cwd(), 'reports', 'brobot-conversation-quality-audit');
  fs.mkdirSync(outDir, { recursive: true });
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const corpus = await fetchCorpus(client);
  await client.end();
  const turns = buildTurns(corpus);
  const scored = await scoreTurns(turns);
  const summary = summarize(scored, corpus);
  fs.writeFileSync(path.join(outDir, 'scored-turns.json'), JSON.stringify(scored, null, 2));
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
