import assert from"node:assert/strict";import{buildInitialNoteRelease}from"./anki-note-release-v2";
const fields=[{name:"Text",rawValue:"{{c1::ACL}} and {{c2::PCL}}"}];
const release=buildInitialNoteRelease([
 {noteGuid:"g",cardOrdinal:0,deckPath:"SnapOrtho::Knee",fieldSnapshot:fields,centralTags:["SnapOrtho::Diagnosis::ACL"]},
 {noteGuid:"g",cardOrdinal:1,deckPath:"SnapOrtho::Knee",fieldSnapshot:fields,centralTags:["SnapOrtho::Diagnosis::ACL","user-tag"]},
],"1.0.0");
assert.equal(release.expectedNoteCount,1);assert.equal(release.expectedCardCount,2);
assert.deepEqual(release.notes[0].expectedCardOrdinals,[0,1]);
assert.deepEqual(release.notes[0].governedTags,["SnapOrtho::Diagnosis::ACL"]);
assert.throws(()=>buildInitialNoteRelease([
 {noteGuid:"g",cardOrdinal:0,deckPath:"A",fieldSnapshot:fields,centralTags:[]},
 {noteGuid:"g",cardOrdinal:1,deckPath:"B",fieldSnapshot:fields,centralTags:[]},
],"x"),/cloze_sibling_deck_mismatch/);
