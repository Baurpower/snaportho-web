import { NextRequest, NextResponse } from 'next/server';
import { normalizeDoi } from '@/lib/brobot/research/literature-review';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const doi = normalizeDoi(String(body?.doi || ''));
    if (!/^10\.\d{4,9}\/.+/.test(doi)) return NextResponse.json({ error: 'Enter a valid DOI.' }, { status: 400 });

    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'SnapOrtho-BroBot/1.0 (mailto:support@snap-ortho.com)' },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return NextResponse.json({ error: 'No metadata was found for that DOI.' }, { status: 404 });
    const item = (await response.json()).message;
    const authors = (item.author || []).map((author: { given?: string; family?: string }) => [author.given, author.family].filter(Boolean).join(' '));
    const year = item.published?.['date-parts']?.[0]?.[0] || item.issued?.['date-parts']?.[0]?.[0] || null;
    return NextResponse.json({
      id: `doi:${doi.toLowerCase()}`, source: 'doi', sourceValue: doi, doi,
      title: item.title?.[0] || '', authors, journal: item['container-title']?.[0] || '', year,
      abstract: String(item.abstract || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    });
  } catch {
    return NextResponse.json({ error: 'Unable to resolve this DOI right now.' }, { status: 500 });
  }
}
