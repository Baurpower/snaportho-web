// Offline, read-only analysis against the repository's current predicate registry.
import fs from 'node:fs';
import { PREDICATE_REGISTRY } from '../../scripts/lib/education/kg-relationship-registry.ts';
const snapshot = JSON.parse(fs.readFileSync(new URL('./database-snapshot.json', import.meta.url), 'utf8'));
const violations = [];
for (const edge of snapshot.extra[0].audit.relationships) {
  const rule = PREDICATE_REGISTRY[edge.p];
  const errors = [];
  if (!rule) errors.push('unknown_predicate');
  if (rule?.subjectEntityTypes && !rule.subjectEntityTypes.includes(edge.sType)) errors.push('subject_type');
  if (rule?.objectEntityTypes && !rule.objectEntityTypes.includes(edge.oType)) errors.push('object_type');
  if (errors.length) violations.push({ ...edge, errors });
}
console.log(JSON.stringify({ comparedEdges: snapshot.extra[0].audit.relationships.length, violations }, null, 2));
