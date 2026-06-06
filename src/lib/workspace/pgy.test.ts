/* eslint-disable @typescript-eslint/no-require-imports */

const {
  getPgyFromGradYear,
  getResidentStatusDetails,
  getResidentStatusFromGradYear,
  isActiveResidentFromGradYear,
  isGraduatedFromGradYear,
  resolvePgyFromSources,
  resolveTrainingLevelFromSources,
} = require("./pgy.ts") as typeof import("./pgy");

function assertEqual<T>(label: string, actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function run() {
  assertEqual("2026 on 2026-06-30 label", getResidentStatusFromGradYear(2026, "2026-06-30"), "PGY-5");
  assertEqual("2026 on 2026-06-30 active", isActiveResidentFromGradYear(2026, "2026-06-30"), true);
  assertEqual("2026 on 2026-07-01 label", getResidentStatusFromGradYear(2026, "2026-07-01"), "Grad");
  assertEqual("2026 on 2026-07-01 graduated", isGraduatedFromGradYear(2026, "2026-07-01"), true);

  assertEqual("2030 on 2026-06-30", getPgyFromGradYear(2030, "2026-06-30"), 1);
  assertEqual("2030 on 2026-07-01", getPgyFromGradYear(2030, "2026-07-01"), 2);
  assertEqual("2030 on 2026-07-15", getPgyFromGradYear(2030, "2026-07-15"), 2);
  assertEqual("2030 on 2027-07-01", getPgyFromGradYear(2030, "2027-07-01"), 3);
  assertEqual("2030 on 2029-07-01", getPgyFromGradYear(2030, "2029-07-01"), 5);
  assertEqual("2030 on 2030-07-01 label", getResidentStatusFromGradYear(2030, "2030-07-01"), "Grad");
  assertEqual("2030 on 2030-07-01 inactive", isActiveResidentFromGradYear(2030, "2030-07-01"), false);

  assertEqual("missing grad year", getPgyFromGradYear(null, "2026-07-01"), null);
  assertEqual("invalid grad year", getPgyFromGradYear(2030.5, "2026-07-01"), null);
  assertEqual("missing grad year status", getResidentStatusFromGradYear(null, "2026-07-01"), "Unknown");
  assertEqual("invalid grad year status", getResidentStatusFromGradYear(2030.5, "2026-07-01"), "Unknown");

  assertEqual(
    "future month uses viewed date",
    getPgyFromGradYear(2030, "2027-08-01"),
    3
  );
  assertEqual(
    "historical month uses viewed date",
    getPgyFromGradYear(2030, "2025-02-01"),
    null
  );

  assertEqual(
    "derived PGY outranks stale stored PGY",
    resolvePgyFromSources({
      gradYear: 2030,
      effectiveDate: "2026-07-15",
      storedPgyYear: 1,
      trainingLevel: "PGY-1",
    }),
    2
  );

  assertEqual(
    "graduate status does not fall back to stale stored PGY",
    resolvePgyFromSources({
      gradYear: 2026,
      effectiveDate: "2026-07-15",
      storedPgyYear: 5,
      trainingLevel: "PGY-5",
    }),
    null
  );

  assertEqual(
    "graduate status resolves to Grad label",
    resolveTrainingLevelFromSources({
      gradYear: 2026,
      effectiveDate: "2026-07-15",
      storedPgyYear: 5,
      trainingLevel: "PGY-5",
    }),
    "Grad"
  );

  assertEqual(
    "fallback stored PGY without grad year",
    resolvePgyFromSources({
      gradYear: null,
      effectiveDate: "2026-07-15",
      storedPgyYear: 4,
      trainingLevel: "PGY-1",
    }),
    4
  );

  assertEqual(
    "fallback training level without grad year",
    resolveTrainingLevelFromSources({
      gradYear: null,
      storedPgyYear: null,
      trainingLevel: "PGY-7",
    }),
    "PGY-7"
  );

  const details = getResidentStatusDetails(2030, "2026-07-01");
  assertEqual("status details label", details.statusLabel, "PGY-2");
  assertEqual("status details pgy", details.pgyYear, 2);
  assertEqual("status details graduation date", details.graduationDate, "2030-07-01");
}

run();
