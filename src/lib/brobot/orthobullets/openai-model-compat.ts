/** Request fields that differ across OpenAI-compatible Chat Completions models. */
export function deterministicSamplingParams(model: string):
  | { temperature: 0 }
  | { reasoning_effort: 'minimal'; max_completion_tokens: 4096 }
  | { max_completion_tokens: 8192 }
  | Record<string, never> {
  const name = model.trim();
  // Muse Spark otherwise chooses its own reasoning depth. Internal reasoning is
  // billed as completion tokens, so an uncapped request can be unexpectedly
  // expensive even when the visible structured JSON is short.
  if (/^muse-spark(?:[.-]|$)/i.test(name)) {
    return { reasoning_effort: 'minimal', max_completion_tokens: 4096 };
  }
  // GPT-5 mini keeps default reasoning. The ceiling stops a runaway reasoning
  // bill without the minimal-effort setting that failed the 3797 canary.
  if (/^gpt-5-mini(?:[.-]|$)/i.test(name)) {
    return { max_completion_tokens: 8192 };
  }
  // Reasoning tokens count toward max_completion_tokens. A 1024 ceiling
  // returned empty content before the JSON was written. 4096 matches Muse
  // and leaves room for the visible answer at nano's output price.
  if (/^gpt-5-nano(?:[.-]|$)/i.test(name)) {
    return { reasoning_effort: 'minimal', max_completion_tokens: 4096 };
  }
  // Other GPT-5 models reject temperature=0. Use the model's default reasoning
  // effort: minimal failed the representative 3797 contract canary, while
  // low produced an unacceptable early unresolved rate in the 500 run.
  return /^gpt-5(?:[.-]|$)/i.test(name) ? {} : { temperature: 0 };
}
