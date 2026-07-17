import type { OrthobulletsPageContext } from '../../shared/types.js';
import { extractHimalayaPageContext, isHimalayaUrl } from './himalaya-extractor.js';

export const HIMALAYA_PROVIDER_ID = 'himalaya' as const;

export function detectHimalayaProvider(pageUrl: string | null | undefined) {
  return isHimalayaUrl(pageUrl) ? HIMALAYA_PROVIDER_ID : null;
}

export function extractHimalayaProviderContext(input: {
  document: Parameters<typeof extractHimalayaPageContext>[0]['document'];
  pageUrl?: string;
}): OrthobulletsPageContext | null {
  return extractHimalayaPageContext(input);
}
