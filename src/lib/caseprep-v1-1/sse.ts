/**
 * Minimal SSE frame parsing shared by the CasePrep v1.1 stream client and
 * proxy. Same wire convention as /api/brobot/chat: `event:` line + `data:`
 * JSON line, frames separated by a blank line.
 */

export type SseEvent = {
  event: string;
  data: unknown;
};

export type SseParseState = {
  buffer: string;
};

export function createSseParseState(): SseParseState {
  return { buffer: "" };
}

/**
 * Feed a decoded chunk; returns every complete event framed so far. Partial
 * frames stay in state.buffer until the next chunk completes them.
 */
export function parseSseChunk(state: SseParseState, chunk: string): SseEvent[] {
  state.buffer += chunk;
  const events: SseEvent[] = [];
  let separatorIndex = state.buffer.indexOf("\n\n");
  while (separatorIndex !== -1) {
    const frame = state.buffer.slice(0, separatorIndex);
    state.buffer = state.buffer.slice(separatorIndex + 2);
    const parsed = parseSseFrame(frame);
    if (parsed) events.push(parsed);
    separatorIndex = state.buffer.indexOf("\n\n");
  }
  return events;
}

export function parseSseFrame(frame: string): SseEvent | null {
  let eventName = "";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }
  if (!eventName && dataLines.length === 0) return null;
  let data: unknown = null;
  if (dataLines.length > 0) {
    try {
      data = JSON.parse(dataLines.join("\n"));
    } catch {
      data = dataLines.join("\n");
    }
  }
  return { event: eventName, data };
}

export function encodeSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
