import { NextRequest, NextResponse } from 'next/server';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getOpenAI } from '@/lib/brobot/openai-client';
import { IntroductionAnalysisSchema, IntroductionInputsSchema, IntroductionReviewInputsSchema, IntroductionReviewSchema, introductionReviewPrompt, introductionWriterPrompt } from '@/lib/brobot/research/introduction-writer';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const review = IntroductionReviewInputsSchema.safeParse(body);
    if (review.success) {
      const completion = await getOpenAI().chat.completions.create({
        model: process.env.BROBOT_RESEARCH_MODEL || 'gpt-5.1',
        messages: [{ role: 'user', content: introductionReviewPrompt(review.data) }],
        response_format: zodResponseFormat(IntroductionReviewSchema, 'introduction_review_v1'),
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('Empty introduction review response');
      return NextResponse.json(IntroductionReviewSchema.parse(JSON.parse(content)));
    }
    if (typeof body === 'object' && body !== null && 'introduction' in body) {
      return NextResponse.json({ error: 'Paste an introduction of at least 80 characters.', details: review.error.flatten() }, { status: 400 });
    }
    const parsed = IntroductionInputsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Complete the required study and evidence fields.', details: parsed.error.flatten() }, { status: 400 });
    }
    const completion = await getOpenAI().chat.completions.create({
      model: process.env.BROBOT_RESEARCH_MODEL || 'gpt-5.1',
      messages: [{ role: 'user', content: introductionWriterPrompt(parsed.data) }],
      response_format: zodResponseFormat(IntroductionAnalysisSchema, 'introduction_writer_v1'),
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('Empty introduction analysis response');
    return NextResponse.json(IntroductionAnalysisSchema.parse(JSON.parse(content)));
  } catch (error) {
    console.error('[introduction-writer] generation failed', error);
    return NextResponse.json({ error: 'BroBot could not complete the introduction analysis. Please try again.' }, { status: 500 });
  }
}
