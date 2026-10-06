/** One inexpensive structured-output request. Performs no database writes. */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import { deterministicSamplingParams } from '../src/lib/brobot/orthobullets/openai-model-compat';
import { resolveObModelProfile } from './lib/ob-model-profile';

function loadEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line) => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#') || !clean.includes('=')) return [];
    const at = clean.indexOf('=');
    return [[clean.slice(0, at).trim(), clean.slice(at + 1).trim().replace(/^['"]|['"]$/g, '')]];
  }));
}
const profileName = process.argv.find((value) => value.startsWith('--model-profile='))?.split('=', 2)[1] ?? 'environment';
const env = { ...loadEnv(path.resolve('.env.local')), ...process.env };
const profile = resolveObModelProfile(profileName, env);
const client = new OpenAI({ apiKey: profile.apiKey, ...(profile.baseURL ? { baseURL: profile.baseURL } : {}) });
const started = Date.now();
const response = await client.chat.completions.create({
  model: profile.models.generator, ...deterministicSamplingParams(profile.models.generator),
  response_format: { type: 'json_object' },
  messages: [{ role: 'system', content: 'Return JSON only.' }, { role: 'user', content: 'Return exactly {"ready":true}.' }],
}, { timeout: 60_000 });
const content = response.choices[0]?.message?.content ?? '';
const parsed = JSON.parse(content) as { ready?: unknown };
if (parsed.ready !== true) throw new Error('provider returned unexpected structured output');
console.log(JSON.stringify({ event: 'provider_ready', profile: profile.name, provider: profile.provider,
  model: profile.models.generator, latencyMs: Date.now() - started,
  usage: { promptTokens: response.usage?.prompt_tokens ?? 0, completionTokens: response.usage?.completion_tokens ?? 0 } }));
