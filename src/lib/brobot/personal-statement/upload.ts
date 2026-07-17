import { PERSONAL_STATEMENT_MAX_FILE_BYTES } from './types';

export type UploadSourceType = 'docx' | 'pdf' | 'txt';
export type UploadErrorCategory =
  | 'empty_file'
  | 'unsupported_file_type'
  | 'file_too_large'
  | 'invalid_file_signature'
  | 'no_extractable_text'
  | 'request_failed'
  | 'invalid_server_response'
  | 'parser_failed'
  | 'unknown_upload_error';

export type ExtractedStatement = { text: string; sourceType: UploadSourceType; filename: string };
type ApiPayload = Partial<ExtractedStatement> & { error?: string; message?: string; requestId?: string };

export class UploadError extends Error {
  constructor(public category: UploadErrorCategory, message: string, public status?: number) { super(message); }
}

const extensions = new Set<UploadSourceType>(['docx', 'pdf', 'txt']);

export function uploadFileExtension(file: Pick<File, 'name'>): UploadSourceType | null {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension && extensions.has(extension as UploadSourceType) ? extension as UploadSourceType : null;
}

export function validatePersonalStatementFile(file?: Pick<File, 'name' | 'size'>): UploadError | null {
  if (!file) return new UploadError('unknown_upload_error', 'Choose a document to upload.');
  if (!uploadFileExtension(file)) return new UploadError('unsupported_file_type', 'Choose a .docx, .pdf, or .txt document.');
  if (file.size === 0) return new UploadError('empty_file', 'This document is empty. Choose another file.');
  if (file.size > PERSONAL_STATEMENT_MAX_FILE_BYTES) return new UploadError('file_too_large', 'Documents must be 5 MB or smaller.');
  return null;
}

function categoryFromApi(code?: string): UploadErrorCategory {
  if (code === 'unsupported_file_type') return 'unsupported_file_type';
  if (code === 'invalid_file_signature') return 'invalid_file_signature';
  if (code === 'no_extractable_text' || code === 'text_extraction_failed') return 'no_extractable_text';
  if (code === 'parser_failed') return 'parser_failed';
  return 'request_failed';
}

export async function extractPersonalStatementFile(file: File, fetcher: typeof fetch = fetch): Promise<ExtractedStatement> {
  const validation = validatePersonalStatementFile(file);
  if (validation) throw validation;
  const extension = uploadFileExtension(file)!;
  const form = new FormData();
  form.append('file', file, file.name);
  let response: Response;
  try {
    response = await fetcher('/api/pathtoortho/personal-statement/extract', { method: 'POST', body: form, credentials: 'same-origin' });
  } catch {
    throw new UploadError('request_failed', 'The document could not be uploaded. Check your connection and try again.');
  }
  const raw = await response.text();
  let payload: ApiPayload;
  try { payload = JSON.parse(raw) as ApiPayload; }
  catch { throw new UploadError('invalid_server_response', 'The document service returned an invalid response. Try again or paste the statement.', response.status); }
  if (!response.ok || !payload.text) {
    throw new UploadError(categoryFromApi(payload.error), payload.message || 'We could not read that document. Try another file or paste the statement.', response.status);
  }
  return { text: payload.text, sourceType: payload.sourceType || extension, filename: payload.filename || file.name };
}

export function stableUploadError(error: unknown, fallback = 'We could not read that document. Try another file or paste the statement.') {
  return error instanceof UploadError ? error : new UploadError('unknown_upload_error', fallback);
}

export function resetNativeFileInput(input: Pick<HTMLInputElement, 'value'> | null) {
  if (input) input.value = '';
}

export function applyUploadWithNonblockingAnalytics(
  result: ExtractedStatement,
  apply: (result: ExtractedStatement) => void,
  track: (result: ExtractedStatement) => unknown,
  onAnalyticsFailure?: (category: 'analytics_failed_nonblocking') => void,
) {
  apply(result);
  try { track(result); }
  catch { onAnalyticsFailure?.('analytics_failed_nonblocking'); }
}
