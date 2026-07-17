import assert from 'node:assert/strict';
import { applyUploadWithNonblockingAnalytics, extractPersonalStatementFile, resetNativeFileInput, UploadError, validatePersonalStatementFile } from './upload';

assert.equal(validatePersonalStatementFile(undefined)?.category, 'unknown_upload_error');
assert.equal(validatePersonalStatementFile({ name: 'empty.txt', size: 0 })?.category, 'empty_file');
assert.equal(validatePersonalStatementFile({ name: 'large.pdf', size: 5 * 1024 * 1024 + 1 })?.category, 'file_too_large');
assert.equal(validatePersonalStatementFile({ name: 'statement.pages', size: 10 })?.category, 'unsupported_file_type');
assert.equal(validatePersonalStatementFile({ name: 'STATEMENT.DOCX', size: 10 }), null);
const input = { value: '/fake/path/statement.txt' };
resetNativeFileInput(input);
assert.equal(input.value, '');
input.value = '/fake/path/statement.txt';
resetNativeFileInput(input);
assert.equal(input.value, '');

async function main() {
  const file = new File(['A useful synthetic statement with enough content.'], 'statement.txt', { type: 'text/plain' });
  let request: RequestInit | undefined;
  const result = await extractPersonalStatementFile(file, async (_url, init) => {
  request = init;
  return new Response(JSON.stringify({ text: 'Extracted text', sourceType: 'txt', filename: 'statement.txt' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  assert.equal(result.text, 'Extracted text');
  assert.ok(request?.body instanceof FormData);
  assert.equal(request?.credentials, 'same-origin');
  assert.equal((request?.headers as Record<string, string> | undefined)?.['Content-Type'], undefined);
  assert.equal((request?.body as FormData).get('file') instanceof File, true);

  await assert.rejects(
    extractPersonalStatementFile(file, async () => new Response('<html>proxy failure</html>', { status: 502 })),
    (error: unknown) => error instanceof UploadError && error.category === 'invalid_server_response' && !/JSON|expected pattern/i.test(error.message),
  );

  let applied = false;
  let analyticsFailure = '';
  applyUploadWithNonblockingAnalytics(result, () => { applied = true; }, () => { throw new DOMException('The string did not match the expected pattern.'); }, (category) => { analyticsFailure = category; });
  assert.equal(applied, true);
  assert.equal(analyticsFailure, 'analytics_failed_nonblocking');

  console.log('personal statement upload client tests passed');
}

void main();
