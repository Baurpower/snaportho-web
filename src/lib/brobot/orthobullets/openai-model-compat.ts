/** Request fields that differ across OpenAI Chat Completions model families. */
export function deterministicSamplingParams(model: string): { temperature?: 0 } {
  // GPT-5 models currently accept only their default temperature value.
  return /^gpt-5(?:[.-]|$)/i.test(model.trim()) ? {} : { temperature: 0 };
}
