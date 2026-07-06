/* eslint-disable @typescript-eslint/no-require-imports */

const {
  inferTrackIdFromRotation,
  inferTrackIdFromService,
} = require("./rotation-track-mapping.ts") as typeof import("./rotation-track-mapping");

function assertTrackMappingEqual<T>(label: string, actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

assertTrackMappingEqual("trauma service", inferTrackIdFromService("Trauma"), "trauma");
assertTrackMappingEqual("hand service", inferTrackIdFromService("Hand Surgery"), "hand");
assertTrackMappingEqual("spine service", inferTrackIdFromService("Spine"), "spine");
assertTrackMappingEqual(
  "adult reconstruction",
  inferTrackIdFromService("Adult Reconstruction"),
  "adult-reconstruction"
);
assertTrackMappingEqual("sports service", inferTrackIdFromService("Sports Medicine"), "sports");
assertTrackMappingEqual("pediatrics service", inferTrackIdFromService("Pediatrics"), "pediatrics");
assertTrackMappingEqual("foot ankle", inferTrackIdFromService("Foot and Ankle"), "foot-ankle");
assertTrackMappingEqual(
  "shoulder elbow",
  inferTrackIdFromService("Shoulder & Elbow"),
  "shoulder-elbow"
);
assertTrackMappingEqual("oncology", inferTrackIdFromService("Orthopaedic Oncology"), "tumor");
assertTrackMappingEqual("oite", inferTrackIdFromService("OITE Review"), "basic-science");
assertTrackMappingEqual("empty service", inferTrackIdFromService(""), null);

assertTrackMappingEqual(
  "rotation title fallback",
  inferTrackIdFromRotation({
    id: "rotation-1",
    user_id: "user-1",
    title: "Home Ortho Sub-I",
    institution: null,
    service: "Trauma",
    location: null,
    start_date: "2026-01-01",
    end_date: "2026-02-01",
    sort_order: 0,
    notes: null,
    is_away_rotation: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  }),
  "trauma"
);

console.log("rotation track mapping tests passed");