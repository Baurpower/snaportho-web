import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import {
  PERSONAL_STATEMENT_MAX_FILE_BYTES,
} from '@/lib/brobot/personal-statement/types';
import { normalizeStatementText } from '@/lib/brobot/personal-statement/contract';

export const runtime = 'nodejs';

const allowed = new Set(['docx', 'pdf', 'txt']);

function error(code: string, message: string, requestId: string, status = 400) {
  return NextResponse.json({ error: code, message, requestId }, { status });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return error('unsupported_file_type', 'Choose a .docx, .pdf, or .txt document.', requestId);
    if (file.size === 0) return error('empty_file', 'This document is empty. Choose another file.', requestId);
    if (file.size > PERSONAL_STATEMENT_MAX_FILE_BYTES) return error('file_too_large', 'Documents must be 5 MB or smaller.', requestId);

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!allowed.has(extension)) return error('unsupported_file_type', 'Choose a .docx, .pdf, or .txt document.', requestId);
    const bytes = Buffer.from(await file.arrayBuffer());
    let text = '';

    try {
      if (extension === 'pdf') {
        if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') return error('invalid_file_signature', 'This file does not appear to be a valid PDF.', requestId);
        const parser = new PDFParse({ data: bytes });
        try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
      } else if (extension === 'docx') {
        if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return error('invalid_file_signature', 'This file does not appear to be a valid DOCX document.', requestId);
        text = (await mammoth.extractRawText({ buffer: bytes })).value;
      } else {
        if (bytes.includes(0)) return error('invalid_file_signature', 'This TXT file appears to contain binary data.', requestId);
        text = bytes.toString('utf8');
      }
    } catch (caught) {
      console.error('[personal-statement-extract] parser failed', { requestId, route: 'personal-statement/extract', extension, size: file.size, parser: extension, outcome: 'parser_failed', error: caught instanceof Error ? caught.name : 'unknown' });
      return error('parser_failed', 'We could not read that document. Try another file or paste the statement.', requestId, 422);
    }

    text = normalizeStatementText(text);
    if (text.length < 40) return error('no_extractable_text', extension === 'pdf' ? 'No usable text could be extracted. If this is a scanned PDF, paste the statement instead.' : 'No usable text could be extracted. Paste the statement instead.', requestId);
    console.info('[personal-statement-extract] extraction completed', { requestId, route: 'personal-statement/extract', extension, size: file.size, parser: extension, outcome: 'success' });
    return NextResponse.json({ text, sourceType: extension, filename: file.name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120), requestId });
  } catch (caught) {
    console.error('[personal-statement-extract] extraction failed', {
      requestId,
      route: 'personal-statement/extract',
      outcome: 'unknown_upload_error',
      error: caught instanceof Error ? caught.name : 'unknown',
    });
    return error('unknown_upload_error', 'We could not read that document. Try another file or paste the statement.', requestId, 422);
  }
}
