import fs from "node:fs";

const path = "scripts/lib/education/kg-adult-reconstruction-topic-catalog.ts";
let s = fs.readFileSync(path, "utf8");

const implantSlugs = [
  "femoral-component",
  "acetabular-component",
  "polyethylene-liner",
  "femoral-stem",
  "tibial-baseplate",
  "tibial-insert",
  "patellar-component",
  "cement-mantle",
  "press-fit-fixation",
  "cemented-fixation",
];

for (const slug of implantSlugs) {
  const re = new RegExp(
    `\\{ subjectSlug: "([^"]+)", predicate: "involves_anatomy", objectSlug: "${slug}"([^}]*)\\}`,
    "g"
  );
  s = s.replace(re, `{ subjectSlug: "${slug}", predicate: "prerequisite_for", objectSlug: "$1"$2}`);
}

s = s.replace(
  'objectSlug: "unicompartmental-knee-arthritis", metadata: { management_importance: "moderate" }',
  'objectSlug: "unicompartmental-knee-arthroplasty", metadata: { management_importance: "moderate" }'
);

fs.writeFileSync(path, s);
console.log("done");