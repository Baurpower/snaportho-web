# BroBot iOS response compatibility repair

## Shipped iOS contract

The production client contract is defined by the committed iOS 1.61 sources. The
uncommitted streaming work in the workspace is not part of that shipped contract.

- `POST https://snap-ortho.com/api/brobot/chat`
- Headers: `Content-Type: application/json`, `Accept: application/json`, and
  `X-BroBot-Chat-Version: v1`. Authenticated users send
  `Authorization: Bearer <Supabase access token>`; guests send `X-Guest-ID` when
  available and otherwise use the shared cookie session.
- JSON request fields are camelCase:
  `conversationId?`, `message`, `mode`, `responseDepth`, `trainingLevel`,
  `source`, `sourceMessageId?`, selected-branch fields, intent fields,
  `answerNow?`, and `stream`. The shipped chat flow explicitly sends
  `stream: false`.
- Any HTTP status in `200...299` is treated as success and decoded as one JSON
  `BroBotChatResponse`. Required fields are `conversationId: String`,
  `messageId: String`, and `answer: String`. All other response fields are
  optional, but a present value must match its Swift type. In particular,
  `detectedMode` and `consultConfidence` must use the client enums, branch
  objects require string `id` and `label`, numeric fields must be JSON numbers,
  and arrays must contain the declared element type. Unknown top-level keys are
  ignored by `JSONDecoder`.
- Non-2xx responses are decoded as the JSON error envelope containing optional
  `error`, `reason`, `message`, `remaining`, and `dailyCap`. Statuses 400, 401,
  403, 429, and 5xx receive specific client classifications.
- A 2xx body that cannot decode as `BroBotChatResponse` produces the exact user
  message: “BroBot returned a response the app could not read.” The optimistic
  user message is marked failed. Retry reuses that local message, re-runs intent
  classification for an ordinary prompt, and reissues the chat request; Dismiss
  only clears the banner.

The newer, unshipped workspace client requests `stream: true` and
`Accept: text/event-stream`. It parses blank-line-delimited SSE frames with
`event:` followed by a single-line `data:` JSON value. `delta` requires a string
`content`; `metadata` must decode as the full `BroBotChatResponse`; `error` may
contain `message`; and absence of valid metadata before EOF is a decoding
failure. `start` and `done` are currently informational to the decoder.

## Backend trace and reproduced mismatch

`src/app/api/brobot/chat/route.ts` normalizes `prompt`, `message`, or `question`
to `message`, validates `BroBotChatRequestSchema`, resolves bearer or guest
identity, applies the entitlement/quota gate, creates or loads the conversation,
persists the user message, loads history, expands intent, normalizes mode/depth/
training level through the schema, runs entity/tier routing and the model
pipeline, persists the assistant response, records usage and telemetry, and
serializes either JSON or SSE. Tier-one async enrichment only augments follow-up
metadata after the initial compatible response.

The transport selection previously used:

```ts
body.stream || BROBOT_STREAMING_ENABLED
```

in both authenticated and guest paths. With the server rollout flag enabled,
the exact shipped iOS request (`stream: false`, `Accept: application/json`) was
therefore answered with `Content-Type: text/event-stream; charset=utf-8` and an
SSE body beginning with `event: start`. The endpoint still returned HTTP 200, so
the shipped app attempted to decode the complete SSE body as JSON and entered
the exact unreadable-response error path. This reproduces the reported contract
failure without requiring a production request, quota consumption, or database
mutation; the transport regression test uses the supplied cubital-tunnel request
contract's transport fields.

## Repair

An explicit request preference now wins. `stream: false` always receives JSON;
`stream: true` continues to receive SSE. When `stream` is omitted, the current
response-contract rollout behavior is retained: the server flag enables SSE for
`web_v2`, while the legacy response contract remains JSON. This preserves the
new response versioning and web behavior while preventing a server flag from
changing an existing JSON client's wire format.
