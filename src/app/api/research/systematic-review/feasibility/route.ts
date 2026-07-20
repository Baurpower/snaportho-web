import { NextRequest, NextResponse } from 'next/server';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getOpenAI } from '@/lib/brobot/openai-client';
import { FeasibilityRequestSchema, FeasibilitySchema, feasibilityPrompt } from '@/lib/brobot/research/systematic-review';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const parsed = FeasibilityRequestSchema.safeParse(await request.json());
    if (!parsed.success || (!parsed.data?.question.population && !parsed.data?.question.title)) return NextResponse.json({ error: 'Define a review title or population before assessing feasibility.' }, { status: 400 });
    const completion = await getOpenAI().chat.completions.create({
      model: process.env.BROBOT_RESEARCH_MODEL || 'gpt-5.1', messages: [{ role: 'user', content: feasibilityPrompt(parsed.data) }],
      response_format: zodResponseFormat(FeasibilitySchema, 'systematic_review_feasibility_v1'),
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('Empty feasibility response');
    return NextResponse.json(FeasibilitySchema.parse(JSON.parse(content)));
  } catch (error) {
    console.error('[systematic-review] feasibility failed', error);
    return NextResponse.json({ error: 'BroBot could not complete the feasibility assessment. Please try again.' }, { status: 500 });
  }
}
