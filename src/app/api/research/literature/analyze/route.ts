import { NextRequest, NextResponse } from 'next/server';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getOpenAI } from '@/lib/brobot/openai-client';
import { LiteratureReviewEvaluationInputsSchema, LiteratureReviewEvaluationSchema, LiteratureReviewRequestSchema, LiteratureSynthesisSchema, literatureReviewEvaluationPrompt, literatureReviewPrompt } from '@/lib/brobot/research/literature-review';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const evaluation = LiteratureReviewEvaluationInputsSchema.safeParse(body);
    if (evaluation.success) {
      const completion = await getOpenAI().chat.completions.create({
        model: process.env.BROBOT_RESEARCH_MODEL || 'gpt-5.1',
        messages: [{ role: 'user', content: literatureReviewEvaluationPrompt(evaluation.data) }],
        response_format: zodResponseFormat(LiteratureReviewEvaluationSchema, 'literature_review_evaluation_v1'),
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('Empty literature review evaluation');
      return NextResponse.json(LiteratureReviewEvaluationSchema.parse(JSON.parse(content)));
    }
    if (typeof body === 'object' && body !== null && 'literatureReview' in body) {
      return NextResponse.json({ error: 'Paste a literature review of at least 80 characters.', details: evaluation.error.flatten() }, { status: 400 });
    }
    const parsed = LiteratureReviewRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Add a research objective and at least one valid study.', details: parsed.error.flatten() }, { status: 400 });
    if (!parsed.data.question.objective && !parsed.data.question.clinicalQuestion) {
      return NextResponse.json({ error: 'A research objective or clinical question is required.' }, { status: 400 });
    }
    const completion = await getOpenAI().chat.completions.create({
      model: process.env.BROBOT_RESEARCH_MODEL || 'gpt-5.1',
      messages: [{ role: 'user', content: literatureReviewPrompt(parsed.data) }],
      response_format: zodResponseFormat(LiteratureSynthesisSchema, 'literature_review_workspace_v1'),
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('Empty analysis response');
    return NextResponse.json(LiteratureSynthesisSchema.parse(JSON.parse(content)));
  } catch (error) {
    console.error('[literature-review] analysis failed', error);
    return NextResponse.json({ error: 'The evidence synthesis could not be completed. Please try again.' }, { status: 500 });
  }
}
