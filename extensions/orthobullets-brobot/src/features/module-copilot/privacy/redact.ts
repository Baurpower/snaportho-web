export function redactSensitiveText(input: string) {
  let text = input;
  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]');
  text = text.replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, '[redacted-phone]');
  text = text.replace(/\b(?:mrn|medical record(?: number)?)\s*[:#]?\s*\d{4,}\b/gi, '[redacted-mrn]');
  text = text.replace(/\b(?:dob|date of birth)\s*[:#]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi, '[redacted-dob]');
  text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted-ssn]');
  text = text.replace(/\b(?:employee id|emp(?:loyee)?\s*#)\s*[:#]?\s*[A-Z0-9-]{3,}\b/gi, '[redacted-employee-id]');
  text = text.replace(/\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,3}\s+(?:st|street|ave|avenue|rd|road|blvd|ln|lane|dr|drive)\b/gi, '[redacted-address]');
  text = text.replace(/\bpatient(?:\s+name)?\s*[:#]\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g, 'Patient: [redacted-name]');
  return text;
}

export function detectLikelyPhi(input: string) {
  const redacted = redactSensitiveText(input);
  const markers = [
    '[redacted-email]',
    '[redacted-phone]',
    '[redacted-mrn]',
    '[redacted-dob]',
    '[redacted-ssn]',
    '[redacted-employee-id]',
    '[redacted-address]',
    '[redacted-name]',
  ];
  return {
    likelyPhi: markers.some((marker) => redacted.includes(marker)),
    redacted,
  };
}
