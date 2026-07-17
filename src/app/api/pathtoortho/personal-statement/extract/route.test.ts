import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { POST } from './route';

async function requestFor(file: File) {
  const form = new FormData();
  form.append('file', file);
  return POST(new Request('http://localhost/api/pathtoortho/personal-statement/extract', { method: 'POST', body: form }));
}

async function main() {
const txtResponse = await requestFor(new File(['First paragraph.\n\nSecond paragraph with useful text.'], 'statement.txt', { type: 'text/plain' }));
assert.equal(txtResponse.status, 200);
assert.match((await txtResponse.json()).text, /Second paragraph/);

const zip = new JSZip();
zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
zip.folder('_rels')?.file('.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
zip.folder('word')?.file('document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Synthetic orthopaedic personal statement paragraph with enough extractable text for validation.</w:t></w:r></w:p></w:body></w:document>');
const docx = await zip.generateAsync({ type: 'uint8array' });
const docxBuffer = new ArrayBuffer(docx.byteLength);
new Uint8Array(docxBuffer).set(docx);
const docxResponse = await requestFor(new File([docxBuffer], 'statement.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
assert.equal(docxResponse.status, 200);
assert.match((await docxResponse.json()).text, /Synthetic orthopaedic/);

const pdf = new jsPDF();
pdf.text('Synthetic text-based PDF personal statement with enough text to extract safely.', 20, 20);
const pdfResponse = await requestFor(new File([pdf.output('arraybuffer')], 'statement.pdf', { type: 'application/pdf' }));
assert.equal(pdfResponse.status, 200);
assert.match((await pdfResponse.json()).text, /Synthetic text-based PDF/);

const scanned = new jsPDF();
scanned.rect(20, 20, 100, 50, 'F');
const scannedResponse = await requestFor(new File([scanned.output('arraybuffer')], 'scan.pdf', { type: 'application/pdf' }));
assert.equal(scannedResponse.status, 400);
assert.equal((await scannedResponse.json()).error, 'no_extractable_text');

const emptyResponse = await requestFor(new File([], 'empty.txt', { type: 'text/plain' }));
assert.equal(emptyResponse.status, 400);
assert.equal((await emptyResponse.json()).error, 'empty_file');

const invalidPdfResponse = await requestFor(new File(['not a pdf'], 'renamed.pdf', { type: 'application/pdf' }));
assert.equal(invalidPdfResponse.status, 400);
assert.equal((await invalidPdfResponse.json()).error, 'invalid_file_signature');

const invalidDocxResponse = await requestFor(new File(['not a docx'], 'renamed.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
assert.equal(invalidDocxResponse.status, 400);
assert.equal((await invalidDocxResponse.json()).error, 'invalid_file_signature');

const unsupported = await requestFor(new File(['binary'], 'statement.exe', { type: 'application/octet-stream' }));
assert.equal(unsupported.status, 400);
assert.equal((await unsupported.json()).error, 'unsupported_file_type');

console.log('personal statement extraction route tests passed');
}

void main();
