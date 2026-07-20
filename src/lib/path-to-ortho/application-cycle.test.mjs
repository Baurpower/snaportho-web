import assert from "node:assert/strict";

import {
  DEFAULT_APPLICATION_CYCLE_DATES,
  createApplicationCycleConfig,
  daysBetweenDateOnly,
  formatDateOnly,
  getApplicationCycleWindows,
  getNextMilestone,
  parseDateOnly,
} from "./application-cycle.ts";

const config = createApplicationCycleConfig({});

// Missing deployment overrides resolve to the version-controlled cycle.
for (const [field, date] of Object.entries(DEFAULT_APPLICATION_CYCLE_DATES)) {
  assert.equal(config[field], date);
}
assert.equal(Object.values(DEFAULT_APPLICATION_CYCLE_DATES).every(Boolean), true);

// A supplied value overrides only its corresponding built-in date.
const overridden = createApplicationCycleConfig({
  NEXT_PUBLIC_PATH_TO_ORTHO_MATCH_DAY_DATE: "2027-03-20",
});
assert.equal(overridden.matchDayDate, "2027-03-20");
assert.equal(overridden.yesNoDayDate, DEFAULT_APPLICATION_CYCLE_DATES.yesNoDayDate);

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

assert.throws(
  () => createApplicationCycleConfig({ NEXT_PUBLIC_PATH_TO_ORTHO_MATCH_DAY_DATE: "2027-02-30" }),
  /Invalid Path to Ortho application-cycle override NEXT_PUBLIC_PATH_TO_ORTHO_MATCH_DAY_DATE: Invalid calendar date/
);
assert.throws(
  () => createApplicationCycleConfig({ NEXT_PUBLIC_PATH_TO_ORTHO_MATCH_DAY_DATE: "2027-03-01" }),
  /must occur after/
);
assert.throws(() => parseDateOnly("09/02/2026"), /YYYY-MM-DD/);

// Formatting is pinned to UTC so a date-only milestone cannot shift in another timezone.
assert.equal(
  formatDateOnly("2026-09-02", { month: "short", day: "numeric", year: "numeric" }),
  "Sep 2, 2026"
);
