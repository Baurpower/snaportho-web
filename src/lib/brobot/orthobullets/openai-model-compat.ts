/** Request fields that differ across OpenAI Chat Completions model families. */
export function deterministicSamplingParams(model: string): { temperature?: 0; reasoning_effort?: 'low' } {
  // GPT-5 models reject temperature=0. Low effort cuts latency and hidden
  // reasoning usage while retaining enough review quality for this workload;
  // the minimal setting failed the representative 3797 contract canary.
  return /^gpt-5(?:[.-]|$)/i.test(model.trim())
    ? { reasoning_effort: 'low' }
    : { temperature: 0 };
}
