import type { MyCasesCase, MyCasesLearningItem, MyCasesTag } from "./types";

const now = "2026-07-20T12:00:00.000Z";
const userId = "20000000-0000-4000-8000-000000000001";
const tag = (index:number, name:string):MyCasesTag => ({ id:`30000000-0000-4000-8000-${String(index).padStart(12,"0")}`, user_id:userId, name, color:null, created_at:now });
const tags = {
  sports:tag(1,"sports"), trauma:tag(2,"trauma"), joints:tag(3,"joints"), hand:tag(4,"hand"), teaching:tag(5,"teaching"),
};
const makeCase = (index:number, overrides:Partial<MyCasesCase>):MyCasesCase => ({
  id:`10000000-0000-4000-8000-${String(index).padStart(12,"0")}`, user_id:userId,
  title:"Educational case", procedure_name:"Procedure", diagnosis:null, status:"completed",
  rotation_context:null, attending_context:null, difficulty:null, autonomy:null,
  preparation:null, debrief:null, source:"web", client_source_id:null, version:1,
  is_archived:false, created_at:now, updated_at:new Date(Date.parse(now)-index*86_400_000).toISOString(), deleted_at:null, tags:[], ...overrides,
});

export const MYCASES_CASE_FIXTURES: MyCasesCase[] = [
  makeCase(1,{title:"ACL reconstruction learning case",procedure_name:"Arthroscopic ACL reconstruction",diagnosis:"ACL tear",rotation_context:"Sports Medicine",attending_context:"Sports service",difficulty:3,autonomy:2,preparation:"Review tunnel position, graft options, and fixation sequence.",debrief:"Revisit femoral tunnel trajectory and tensioning sequence.",tags:[tags.sports,tags.teaching]}),
  makeCase(2,{title:"Direct anterior hip",procedure_name:"Primary total hip arthroplasty",diagnosis:"Hip osteoarthritis",rotation_context:"Adult Reconstruction",attending_context:"Joints service",difficulty:4,autonomy:2,tags:[tags.joints]}),
  makeCase(3,{title:"Distal radius teaching case",procedure_name:"Open reduction internal fixation of distal radius fracture",diagnosis:"Intra-articular distal radius fracture",rotation_context:"Hand & Upper Extremity",status:"upcoming",tags:[tags.hand,tags.trauma]}),
  makeCase(4,{title:"Carpal tunnel release",procedure_name:"Open carpal tunnel release",diagnosis:"Carpal tunnel syndrome",rotation_context:"Hand",tags:[tags.hand]}),
  makeCase(5,{title:"Complex periarticular trauma review",procedure_name:"Staged fixation of a comminuted bicondylar tibial plateau fracture",diagnosis:"High-energy bicondylar tibial plateau fracture with metaphyseal comminution",rotation_context:"Orthopaedic Trauma",attending_context:"Trauma service",difficulty:5,autonomy:1,tags:[tags.trauma,tags.teaching]}),
  makeCase(6,{title:"Shoulder instability review",procedure_name:"Arthroscopic Bankart repair",diagnosis:"Recurrent anterior shoulder instability",rotation_context:"Sports Medicine",is_archived:true,status:"archived",tags:[tags.sports]}),
  makeCase(7,{title:"Ankle fracture follow-up",procedure_name:"Bimalleolar ankle fracture fixation",diagnosis:"Unstable ankle fracture",rotation_context:"Trauma",tags:[tags.trauma]}),
];

const makeItem = (index:number, overrides:Partial<MyCasesLearningItem>):MyCasesLearningItem => ({
  id:`40000000-0000-4000-8000-${String(index).padStart(12,"0")}`,user_id:userId,case_id:null,kind:"note",title:null,content:"Educational learning item.",procedure_name:null,diagnosis:null,rotation_context:null,attending_context:null,topic:null,source:"web",client_source_id:null,version:1,is_pinned:false,is_favorite:false,is_archived:false,created_at:now,updated_at:new Date(Date.parse(now)-index*3_600_000).toISOString(),deleted_at:null,tags:[],...overrides,
});
export const MYCASES_LEARNING_FIXTURES: MyCasesLearningItem[] = [
  makeItem(1,{case_id:MYCASES_CASE_FIXTURES[0].id,kind:"pearl",title:"Tunnel trajectory",content:"Keep the femoral tunnel trajectory reproducible before committing to the guidewire.",procedure_name:"ACL reconstruction",topic:"Technique",is_pinned:true,tags:[tags.sports]}),
  makeItem(2,{case_id:MYCASES_CASE_FIXTURES[0].id,kind:"reflection",title:"Sequence and visualization",content:"Portal placement made the sequence easier; pause before drilling to re-establish the full notch view.",procedure_name:"ACL reconstruction",rotation_context:"Sports Medicine",tags:[tags.teaching]}),
  makeItem(3,{case_id:MYCASES_CASE_FIXTURES[1].id,kind:"preparation",title:"Anterior approach setup",content:"Confirm table position, fluoroscopy access, implant options, and the plan for restoring offset.",procedure_name:"Total hip arthroplasty",is_favorite:true,tags:[tags.joints]}),
  makeItem(4,{case_id:MYCASES_CASE_FIXTURES[2].id,kind:"question",title:"When should the DRUJ be tested?",content:"Clarify the preferred sequence for assessing DRUJ stability after restoring length and volar tilt.",procedure_name:"Distal radius fixation",tags:[tags.hand]}),
  makeItem(5,{kind:"note",title:"General call preparation",content:"Before a busy call shift, review reduction equipment locations and the escalation plan for urgent imaging.",topic:"Workflow",tags:[tags.trauma]}),
  makeItem(6,{case_id:MYCASES_CASE_FIXTURES[4].id,kind:"preference",title:"Plate positioning check",content:"Use the final lateral view to deliberately verify posterior slope and plate position before closure.",attending_context:"Trauma service",tags:[tags.trauma]}),
  makeItem(7,{case_id:MYCASES_CASE_FIXTURES[0].id,kind:"postop_learning",title:"Post-op protocol",content:"Connect fixation choice and graft type to the rehabilitation constraints documented in the teaching plan.",procedure_name:"ACL reconstruction",tags:[tags.sports]}),
  makeItem(8,{kind:"checklist",title:"Case review checklist",content:"Indication\nImaging\nApproach\nImplants\nKey risks\nPost-op plan",topic:"Preparation",is_archived:true,tags:[tags.teaching]}),
];

const fixtureAsset = (caseIndex:number, assetIndex:number, image:string, caption:string) => ({
  id:`50000000-0000-4000-8000-${String(caseIndex*10+assetIndex).padStart(12,"0")}`,
  case_id:MYCASES_CASE_FIXTURES[caseIndex-1].id,caption,media_type:"image/webp" as const,byte_size:184000,width:assetIndex===3?900:1600,height:assetIndex===3?1400:900,processing_status:"ready" as const,version:1,created_at:now,updated_at:now,deleted_at:null,
  view:{imageUrl:image,thumbnailUrl:image,expiresAt:"2099-01-01T00:00:00.000Z"},
});
export const MYCASES_MEDIA_FIXTURES = {
  [MYCASES_CASE_FIXTURES[0].id]:[
    fixtureAsset(1,1,"/mycases-fixtures/blueprint-landscape.svg","Synthetic tunnel-planning teaching view"),
    fixtureAsset(1,2,"/mycases-fixtures/instrument-layout.svg","Synthetic instrument sequence"),
    fixtureAsset(1,3,"/mycases-fixtures/portrait-planning.svg","Synthetic portrait planning reference"),
  ],
  [MYCASES_CASE_FIXTURES[1].id]:[fixtureAsset(2,1,"/mycases-fixtures/portrait-planning.svg","Synthetic component-planning view")],
  [MYCASES_CASE_FIXTURES[2].id]:[fixtureAsset(3,1,"/mycases-fixtures/instrument-layout.svg","Synthetic fixation planning view")],
  [MYCASES_CASE_FIXTURES[6].id]:[{...fixtureAsset(7,1,"/mycases-fixtures/blueprint-landscape.svg","Unavailable synthetic thumbnail"),failedThumbnail:true}],
};
