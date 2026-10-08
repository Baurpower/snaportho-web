import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parseHTML } = require('linkedom');

import { extractOrthobulletsPageContext } from '../content/extractor.js';
import type { ReviewReadinessInput } from '../shared/review-readiness.js';
import {
  ReviewReadinessError,
  waitForCompletedReviewContext,
  type ReviewExtractResult,
} from './review-readiness-poll.js';

const ROOT = process.cwd();
const FIXTURES_DIR = path.join(ROOT, 'extensions/orthobullets-brobot/fixtures');
const load = (name: string) => parseHTML(readFileSync(path.join(FIXTURES_DIR, name), 'utf8')).document;
const COMPLETE_URL = 'https://www.orthobullets.com/testview?qid=210141&ans=5&test=OBQ17';

const immediate = extractOrthobulletsPageContext({
  document: load('synthetic-review-immediate-partial.html'),
  pageUrl: COMPLETE_URL,
});
const complete = extractOrthobulletsPageContext({
  document: load('synthetic-review-async-complete.html'),
  pageUrl: COMPLETE_URL,
});
const unrevealed = extractOrthobulletsPageContext({
  document: load('synthetic-review-unrevealed.html'),
  pageUrl: COMPLETE_URL,
});
const loggedOut = extractOrthobulletsPageContext({
  document: load('synthetic-review-logged-out.html'),
  pageUrl: COMPLETE_URL,
});
assert.equal(complete.reviewState, 'ready');

const grown: ReviewReadinessInput = {
  ...complete,
  explanationText: `${complete.explanationText} Additional delayed teaching sentence.`,
};

function sequenceExtractor(pages: ReviewReadinessInput[]) {
  let index = 0;
  return async (): Promise<ReviewExtractResult> => ({
    ok: true,
    page: pages[Math.min(index++, pages.length - 1)],
  });
}

function fakeClock() {
  let now = 0;
  return {
    now: () => now,
    sleep: async (ms: number) => {
      now += ms;
    },
  };
}

async function main() {
  // Delayed content settles without a fixed sleep.
  {
    const clock = fakeClock();
    const ready = await waitForCompletedReviewContext({
      expectedQuestionId: '210141',
      extract: sequenceExtractor([immediate, immediate, complete, complete]),
      sleep: clock.sleep,
      now: clock.now,
    });
    assert.equal(ready.attempts, 4);
    assert.equal(ready.diagnostics.state, 'ready');
    assert.equal((ready.page as { questionId?: string }).questionId, '210141');
  }

  // Two consecutive matching fingerprints: a still-growing explanation
  // restarts stability instead of resolving on a partially painted DOM.
  {
    const clock = fakeClock();
    const ready = await waitForCompletedReviewContext({
      expectedQuestionId: '210141',
      extract: sequenceExtractor([complete, grown, grown]),
      sleep: clock.sleep,
      now: clock.now,
    });
    assert.equal(ready.attempts, 3);
    assert.equal(ready.diagnostics.state, 'ready');
  }

  // Failed extractions are tolerated while the tab settles.
  {
    const clock = fakeClock();
    let calls = 0;
    const ready = await waitForCompletedReviewContext({
      expectedQuestionId: '210141',
      extract: async () => {
        calls += 1;
        if (calls === 1) return { ok: false as const, error: 'content script not ready' };
        return { ok: true as const, page: complete };
      },
      sleep: clock.sleep,
      now: clock.now,
    });
    assert.equal(ready.attempts, 3);
  }

  // Mutation notifications wake the poll early instead of sleeping.
  {
    const clock = fakeClock();
    let sleeps = 0;
    let wakes = 0;
    const ready = await waitForCompletedReviewContext({
      expectedQuestionId: '210141',
      extract: sequenceExtractor([immediate, complete, complete]),
      sleep: async () => {
        sleeps += 1;
      },
      now: clock.now,
      waitForWake: async () => {
        wakes += 1;
      },
    });
    assert.equal(ready.attempts, 3);
    assert.ok(wakes >= 2);
    assert.equal(sleeps, 0);
  }

  // Timeout returns structured missing-field diagnostics.
  {
    const clock = fakeClock();
    await assert.rejects(
      waitForCompletedReviewContext({
        expectedQuestionId: '210141',
        extract: sequenceExtractor([immediate]),
        sleep: clock.sleep,
        now: clock.now,
        pollIntervalMs: 300,
        timeoutMs: 1000,
      }),
      (error: unknown) => {
        assert.ok(error instanceof ReviewReadinessError);
        assert.equal(error.diagnostics.errorCode, 'orthobullets_review_load_timeout');
        assert.ok(error.diagnostics.missingFields.includes('explanationText'));
        assert.ok(error.attempts >= 2);
        return true;
      },
    );
  }

  // Unsafe states fail fast on the first extraction: no polling loop can
  // resolve them, and background processing must never click an answer.
  for (const [page, errorCode] of [
    [unrevealed, 'orthobullets_review_not_revealed'],
    [loggedOut, 'orthobullets_login_required'],
  ] as const) {
    await assert.rejects(
      waitForCompletedReviewContext({
        expectedQuestionId: '210141',
        extract: sequenceExtractor([page]),
        sleep: fakeClock().sleep,
        now: fakeClock().now,
      }),
      (error: unknown) => {
        assert.ok(error instanceof ReviewReadinessError);
        assert.equal(error.diagnostics.errorCode, errorCode);
        assert.equal(error.attempts, 1);
        return true;
      },
    );
  }

  // Wrong-question navigation fails fast with a mismatch error.
  {
    await assert.rejects(
      waitForCompletedReviewContext({
        expectedQuestionId: '9999',
        extract: sequenceExtractor([complete]),
        sleep: fakeClock().sleep,
        now: fakeClock().now,
      }),
      (error: unknown) => {
        assert.ok(error instanceof ReviewReadinessError);
        assert.equal(error.diagnostics.errorCode, 'orthobullets_question_mismatch');
        assert.equal(error.attempts, 1);
        return true;
      },
    );
  }

  // Background review processing never invokes .click() on answer controls.
  for (const file of [
    'extensions/orthobullets-brobot/src/sidepanel/review-readiness-poll.ts',
    'extensions/orthobullets-brobot/src/sidepanel/App.ts',
    'extensions/orthobullets-brobot/src/background.ts',
    'extensions/orthobullets-brobot/src/content/content-script.ts',
  ]) {
    const source = readFileSync(path.join(ROOT, file), 'utf8');
    assert.ok(
      !source.includes('.click('),
      `${file} must never invoke .click() during background review processing`,
    );
  }

  // The normal extension workflow never persists raw page content: the
  // debrief checkpoint drops the page context before every write.
  {
    const appSource = readFileSync(
      path.join(ROOT, 'extensions/orthobullets-brobot/src/sidepanel/App.ts'),
      'utf8',
    );
    assert.ok(
      appSource.includes('question.pageContext = null'),
      'debrief checkpoints must drop the raw page context before persisting',
    );
  }

  console.log('Review readiness polling tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
