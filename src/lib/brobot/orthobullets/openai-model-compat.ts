/** Request fields that differ across OpenAI-compatible Chat Completions models. */
export function deterministicSamplingParams(model: string):
  | { temperature: 0 }
  | { reasoning_effort: 'minimal'; max_completion_tokens: 4096 }
  | Record<string, never> {
  // Muse Spark otherwise chooses its own reasoning depth. Internal reasoning is
  // billed as completion tokens, so an uncapped request can be unexpectedly
  // expensive even when the visible structured JSON is short.
  if (/^muse-spark(?:[.-]|$)/i.test(model.trim())) {
    return { reasoning_effort: 'minimal', max_completion_tokens: 4096 };
  }
  // GPT-5 models reject temperature=0. Use the model's default reasoning
  // effort: minimal failed the representative 3797 contract canary, while
  // low produced an unacceptable early unresolved rate in the 500 run.
  return /^gpt-5(?:[.-]|$)/i.test(model.trim()) ? {} : { temperature: 0 };
}
