import assert from "node:assert/strict";
import { parseCaseInput, parseLearningItemInput } from "./validation";

const caseInput = parseCaseInput({ title:"ACL reconstruction", procedure_name:"ACL reconstruction", status:"completed", tags:["sports","sports"] });
assert.deepEqual(caseInput.tags, ["sports"]);
assert.equal(caseInput.status, "completed");
const item = parseLearningItemInput({ kind:"pearl", content:"Keep the tunnel trajectory reproducible.", case_id:null });
assert.equal(item.kind, "pearl");
assert.throws(() => parseLearningItemInput({ kind:"note", content:"x", patient_name:"blocked" }), /not accepted/);
assert.throws(() => parseCaseInput({ title:"x", procedure_name:"x", mrn:"blocked" }), /not accepted/);
assert.throws(() => parseLearningItemInput({ kind:"unknown", content:"x" }), /Invalid/);
assert.throws(() => parseCaseInput({ title:"x", procedure_name:"x", difficulty:7 }), /0 to 5/);
console.log("MyCases validation tests passed");
