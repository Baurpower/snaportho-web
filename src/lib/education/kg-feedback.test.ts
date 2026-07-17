import assert from "node:assert/strict";

// @ts-expect-error TS5097: explicit .ts suffix is required by the direct Node test runner.
import { sanitizeKgFeedbackText, sanitizeKgProductContext, submitKgGraphFeedback } from "./kg-feedback.ts";

assert.equal(
  sanitizeKgFeedbackText("email a@example.com phone 415-555-1212 id 123456789", 200),
  "email [redacted-email] phone [redacted-phone] id [redacted-identifier]"
);
assert.deepEqual(
  sanitizeKgProductContext({
    screen: "topic",
    patientName: "Do not store",
    nested: { mrn: "12345678", safe: "kept" },
  }),
  { screen: "topic", nested: { safe: "kept" } }
);

const insertedRows: Record<string, unknown>[] = [];
const client = {
  from(table: string) {
    assert.equal(table, "kg_graph_feedback_events");
    return {
      insert(value: Record<string, unknown>) {
        insertedRows.push(value);
        return {
          select(columns: string) {
            assert.equal(columns, "id,created_at");
            return {
              async single() {
                return {
                  data: { id: "feedback-id", created_at: "2026-07-16T00:00:00.000Z" },
                  error: null,
                };
              },
            };
          },
        };
      },
    };
  },
};

const result = await submitKgGraphFeedback(client, "user-id", {
  productSurface: "brobot",
  releaseId: "kg-beta-test",
  feedbackType: "incorrect_relationship",
  userQuery: "Call 415-555-1212",
  productContext: { patientEmail: "a@example.com", route: "/prepare" },
});
assert.deepEqual(result, { id: "feedback-id", createdAt: "2026-07-16T00:00:00.000Z" });
assert.equal(insertedRows[0]?.user_query, "Call [redacted-phone]");
assert.deepEqual(insertedRows[0]?.product_context, { route: "/prepare" });

console.log("kg-feedback.test.ts: all assertions passed");
