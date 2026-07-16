import assert from "node:assert/strict";

import {
  createApplicationCycleConfig,
  daysBetweenDateOnly,
  formatDateOnly,
  getApplicationCycleWindows,
  getNextMilestone,
  parseDateOnly,
} from "./application-cycle.ts";

const env = {
  NEXT_PUBLIC_PATH_TO_ORTHO_ERAS_APPLICATION_OPEN_DATE: "2026-09-02",
  NEXT_PUBLIC_PATH_TO_ORTHO_ERAS_PROGRAM_REVIEW_DATE: "2026-09-23",
  NEXT_PUBLIC_PATH_TO_ORTHO_NRMP_REGISTRATION_OPEN_DATE: "2026-09-15",
  NEXT_PUBLIC_PATH_TO_ORTHO_NRMP_REGISTRATION_CLOSE_DATE: "2027-01-29",
  NEXT_PUBLIC_PATH_TO_ORTHO_NRMP_RANKING_OPEN_DATE: "2027-02-01",
  NEXT_PUBLIC_PATH_TO_ORTHO_NRMP_RANKING_CLOSE_DATE: "2027-03-03",
  NEXT_PUBLIC_PATH_TO_ORTHO_YES_NO_DAY_DATE: "2027-03-15",
  NEXT_PUBLIC_PATH_TO_ORTHO_MATCH_DAY_DATE: "2027-03-19",
};

const config = createApplicationCycleConfig(env);

assert.deepEqual(
  config.milestones.map(({ date }) => date),
  ["2026-09-02", "2026-09-15", "2026-09-23", "2027-01-29", "2027-02-01", "2027-03-03", "2027-03-15", "2027-03-19"]
);
assert.equal(formatDateOnly(config.erasApplicationOpenDate), "September 2, 2026");
assert.equal(daysBetweenDateOnly(config.yesNoDayDate, config.matchDayDate), 4);
assert.equal(getNextMilestone(config.milestones, "2027-03-04")?.label, "Yes/No Day");
assert.equal(getNextMilestone(config.milestones, "2027-03-20"), null);

assert.equal(getApplicationCycleWindows(config, "2026-09-15").nrmpRegistrationOpen, true);
assert.equal(getApplicationCycleWindows(config, "2027-01-29").nrmpRegistrationOpen, true);
assert.equal(getApplicationCycleWindows(config, "2027-01-30").nrmpRegistrationOpen, false);
assert.equal(getApplicationCycleWindows(config, "2027-02-01").rankOrderListOpen, true);
assert.equal(getApplicationCycleWindows(config, "2027-03-03").rankOrderListOpen, true);
assert.equal(getApplicationCycleWindows(config, "2027-03-04").rankOrderListOpen, false);
assert.equal(getApplicationCycleWindows(config, "2027-03-15").isYesNoDay, true);
assert.equal(getApplicationCycleWindows(config, "2027-03-19").isMatchDay, true);

assert.throws(() => createApplicationCycleConfig({}), /Missing Path to Ortho/);
assert.throws(
  () => createApplicationCycleConfig({ ...env, NEXT_PUBLIC_PATH_TO_ORTHO_MATCH_DAY_DATE: "2027-02-30" }),
  /Invalid calendar date/
);
assert.throws(
  () => createApplicationCycleConfig({ ...env, NEXT_PUBLIC_PATH_TO_ORTHO_MATCH_DAY_DATE: "2027-03-01" }),
  /must occur after/
);
assert.throws(() => parseDateOnly("09/02/2026"), /YYYY-MM-DD/);

// Formatting is pinned to UTC so a date-only milestone cannot shift in another timezone.
assert.equal(
  formatDateOnly("2026-09-02", { month: "short", day: "numeric", year: "numeric" }),
  "Sep 2, 2026"
);
