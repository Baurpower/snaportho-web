/** Request fields that differ across OpenAI Chat Completions model families. */
export function deterministicSamplingParams(model: string): { temperature?: 0 } {
  // GPT-5 models reject temperature=0. Use the model's default reasoning
  // effort: minimal failed the representative 3797 contract canary, while
  // low produced an unacceptable early unresolved rate in the 500 run.
  return /^gpt-5(?:[.-]|$)/i.test(model.trim()) ? {} : { temperature: 0 };
}
