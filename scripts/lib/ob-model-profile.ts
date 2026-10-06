export type ObStageModels = {
  generator: string; reviewer: string; coverage: string;
  repair: string; validator: string; resolution: string;
};

export type ObModelProfile = {
  name: string;
  provider: string;
  apiKey: string;
  baseURL: string | null;
  models: ObStageModels;
  promptPricePer1kUsd: number;
  completionPricePer1kUsd: number;
  pricingVersion: string;
};

function allStages(model: string): ObStageModels {
  return { generator: model, reviewer: model, coverage: model, repair: model, validator: model, resolution: model };
}

function required(env: Record<string, string | undefined>, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is not configured`);
  return value;
}

function price(value: string | undefined, fallback: number, key: string): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${key} must be a nonnegative finite number`);
  return parsed;
}

function requiredPrice(env: Record<string, string | undefined>, key: string): number {
  return price(required(env, key), 0, key);
}

function validateBaseURL(value: string): string {
  const url = new URL(value);
  const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) throw new Error('model base URL must use HTTPS (HTTP is allowed only for localhost)');
  return value.replace(/\/$/, '');
}

export function resolveObModelProfile(name: string, env: Record<string, string | undefined>): ObModelProfile {
  if (name === 'gpt5-nano') {
    return { name, provider: 'openai', apiKey: required(env, 'OPENAI_API_KEY'), baseURL: null,
      models: allStages('gpt-5-nano'), promptPricePer1kUsd: 0.00005, completionPricePer1kUsd: 0.0004,
      pricingVersion: 'openai-gpt5-nano-2026-10-01' };
  }
  if (name === 'muse-spark') {
    return { name, provider: 'meta-model-api', apiKey: required(env, 'MODEL_API_KEY'),
      baseURL: 'https://api.meta.ai/v1', models: allStages(env.MUSE_MODEL?.trim() || 'muse-spark-1.3'),
      promptPricePer1kUsd: 0.00125, completionPricePer1kUsd: 0.00425,
      pricingVersion: 'meta-muse-spark-standard-2026-10-05' };
  }
  if (name === 'custom-compatible') {
    const model = required(env, 'OB_MODEL_ID');
    return { name, provider: env.OB_MODEL_PROVIDER?.trim() || 'custom-compatible',
      apiKey: required(env, 'OB_MODEL_API_KEY'), baseURL: validateBaseURL(required(env, 'OB_MODEL_BASE_URL')),
      models: allStages(model),
      promptPricePer1kUsd: requiredPrice(env, 'OB_MODEL_PROMPT_PER_1K_USD'),
      completionPricePer1kUsd: requiredPrice(env, 'OB_MODEL_COMPLETION_PER_1K_USD'),
      pricingVersion: env.OB_MODEL_PRICING_VERSION?.trim() || 'operator-supplied-v1' };
  }
  if (name !== 'environment') throw new Error('unsupported --model-profile (use environment, gpt5-nano, muse-spark, or custom-compatible)');
  const strong = env.BROBOT_STRONG_MODEL?.trim() || 'gpt-4o';
  return { name, provider: 'openai', apiKey: required(env, 'OPENAI_API_KEY'), baseURL: null,
    models: {
      generator: env.BROBOT_OB_CLAIMS_GENERATOR_MODEL?.trim() || strong,
      reviewer: env.BROBOT_OB_CLAIMS_CRITIC_MODEL?.trim() || strong,
      coverage: env.BROBOT_OB_CLAIMS_REVIEW_MODEL?.trim() || strong,
      repair: env.BROBOT_OB_CLAIMS_REVIEW_MODEL?.trim() || strong,
      validator: strong, resolution: strong,
    },
    promptPricePer1kUsd: price(env.BROBOT_COST_PROMPT_PER_1K_USD, 0.0025, 'BROBOT_COST_PROMPT_PER_1K_USD'),
    completionPricePer1kUsd: price(env.BROBOT_COST_COMPLETION_PER_1K_USD, 0.01, 'BROBOT_COST_COMPLETION_PER_1K_USD'),
    pricingVersion: env.BROBOT_PRICING_VERSION?.trim() || 'operator-supplied-v1' };
}
