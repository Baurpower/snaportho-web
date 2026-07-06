import fs from "node:fs";

const path = "scripts/lib/education/kg-adult-reconstruction-topic-catalog.ts";
let s = fs.readFileSync(path, "utf8");

s = s.replace(
  /subjectSlug: "([^"]+)", predicate: "related_to", objectSlug: "([^"]+)"/g,
  'subjectSlug: "$2", predicate: "prerequisite_for", objectSlug: "$1"'
);
s = s.replace(
  /subjectSlug: "([^"]+)", predicate: "bridges_to", objectSlug: "([^"]+)"/g,
  'subjectSlug: "$2", predicate: "prerequisite_for", objectSlug: "$1"'
);

fs.writeFileSync(path, s);
console.log("fixed");