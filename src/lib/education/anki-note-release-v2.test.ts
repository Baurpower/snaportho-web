import assert from"node:assert/strict";import{buildInitialNoteRelease}from"./anki-note-release-v2";
const id=(x:string)=>`${x.repeat(8)}-${x.repeat(4)}-4${x.repeat(3)}-8${x.repeat(3)}-${x.repeat(12)}`;
const fields=[{name:"Text",rawValue:"{{c1::ACL}} and {{c2::PCL}}"}];
const release=buildInitialNoteRelease([
 {canonicalCardId:id("1"),noteGuid:"g",cardOrdinal:0,deckPath:"SnapOrtho::Knee",fieldSnapshot:fields,centralTags:["SnapOrtho::Diagnosis::ACL"]},
 {canonicalCardId:id("1"),noteGuid:"g",cardOrdinal:1,deckPath:"SnapOrtho::Knee",fieldSnapshot:fields,centralTags:["SnapOrtho::Diagnosis::ACL","user-tag"]},
],"1.0.0");
assert.equal(release.expectedNoteCount,1);assert.equal(release.expectedCardCount,2);
assert.deepEqual(release.notes[0].expectedCardOrdinals,[0,1]);
assert.deepEqual(release.notes[0].governedTags,["SnapOrtho::Diagnosis::ACL"]);
assert.equal(buildInitialNoteRelease([
 {canonicalCardId:id("1"),noteGuid:"g",cardOrdinal:0,deckPath:"A",fieldSnapshot:fields,centralTags:[]},
 {canonicalCardId:id("1"),noteGuid:"g",cardOrdinal:1,deckPath:"B",fieldSnapshot:fields,centralTags:[]},
],"x").notes[0].deckPath,"SnapOrtho");
assert.equal(release.notes[0].deckPath,"SnapOrtho");
