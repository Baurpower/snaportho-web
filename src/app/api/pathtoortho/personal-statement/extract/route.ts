import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import {
  PERSONAL_STATEMENT_MAX_FILE_BYTES,
} from '@/lib/brobot/personal-statement/types';
import { normalizeStatementText } from '@/lib/brobot/personal-statement/contract';

export const runtime = 'nodejs';

const allowed = new Set(['docx', 'pdf', 'txt']);

function error(code: string, message: string, status = 400) {
  return NextResponse.json({ error: code, message }, { status });
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return error('unsupported_file_type', 'Choose a .docx, .pdf, or .txt document.');
    if (file.size === 0 || file.size > PERSONAL_STATEMENT_MAX_FILE_BYTES) return error('file_too_large', 'Documents must be between 1 byte and 5 MB.');

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!allowed.has(extension)) return error('unsupported_file_type', 'Choose a .docx, .pdf, or .txt document.');
    const bytes = Buffer.from(await file.arrayBuffer());
    let text = '';

    if (extension === 'pdf') {
      if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') return error('unsupported_file_type', 'This file does not appear to be a valid PDF.');
      const parser = new PDFParse({ data: bytes });
      try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
    } else if (extension === 'docx') {
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return error('unsupported_file_type', 'This file does not appear to be a valid DOCX document.');
      text = (await mammoth.extractRawText({ buffer: bytes })).value;
    } else {
      if (bytes.includes(0)) return error('unsupported_file_type', 'This TXT file appears to contain binary data.');
      text = bytes.toString('utf8');
    }

    text = normalizeStatementText(text);
    if (text.length < 40) return error('text_extraction_failed', extension === 'pdf' ? 'No usable text could be extracted. If this is a scanned PDF, paste the statement instead.' : 'No usable text could be extracted. Paste the statement instead.');
    return NextResponse.json({ text, sourceType: extension, filename: file.name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120) });
  } catch {
    return error('text_extraction_failed', 'We could not read that document. Try another file or paste the statement.', 422);
  }
}
