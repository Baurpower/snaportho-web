export type MyOrthoSource = {
  sourceId: string;
  title: string;
  publisher: string;
  url: string;
  articleIds: string[];
  topics: string[];
  content: string;
};

/**
 * Small, reviewed-at-ingestion source snapshots for patient education.
 * Answers may cite only these records. Update deliberately when source guidance changes.
 */
export const MYORTHO_SOURCES: MyOrthoSource[] = [
  {
    sourceId: 'myortho-understanding', title: 'Understanding Knee Replacement', publisher: 'MyOrtho Companion',
    url: 'myortho://knowledge/understanding', articleIds: ['knee-basics', 'what-is-replaced', 'total-partial'],
    topics: ['anatomy', 'arthritis', 'implant', 'partial', 'total', 'procedure'],
    content: 'The knee is where the femur, tibia, and patella meet. Cartilage supports low-friction movement; ligaments and muscles support stability. Knee replacement resurfaces damaged bone ends with metal components and a durable plastic spacer; it does not replace every structure. Total replacement resurfaces multiple compartments. Partial replacement treats one affected compartment and is appropriate only for selected patients. The usual goals are less pain and better function, but an artificial knee may not feel exactly like a natural knee.',
  },
  {
    sourceId: 'myortho-preparation', title: 'Getting Ready for Surgery', publisher: 'MyOrtho Companion',
    url: 'myortho://knowledge/preparing', articleIds: ['prepare-home', 'week-before', 'questions-before'],
    topics: ['prepare', 'home', 'before', 'surgery', 'medicine', 'fasting', 'questions'],
    content: 'Prepare clear walking paths, remove loose rugs and cords, improve lighting, and place commonly used items within reach. Arrange rides, meals, and help. Follow the surgical team’s individual instructions about eating, drinking, skin preparation, medicines, supplements, arrival time, and equipment. Do not stop or change medicines on your own. Report a new illness, fever, skin problem near the operation site, dental infection, or other change the team asked about.',
  },
  {
    sourceId: 'myortho-surgery-day', title: 'Surgery Day', publisher: 'MyOrtho Companion',
    url: 'myortho://knowledge/surgery-day', articleIds: ['arrival', 'anesthesia', 'waking-up'],
    topics: ['hospital', 'anesthesia', 'spinal', 'nerve block', 'recovery room', 'surgery day'],
    content: 'The hospital team confirms identity, procedure, medicines, allergies, and fasting status. Repeated questions are normal safety checks. General anesthesia causes unconsciousness. Regional techniques numb part of the body and may be paired with sedation; nerve blocks may support pain control. In recovery, staff monitor breathing, blood pressure, comfort, and the surgical leg. Patients should not get up without assistance until staff say it is safe.',
  },
  {
    sourceId: 'myortho-home-recovery', title: 'Your First Days at Home', publisher: 'MyOrtho Companion',
    url: 'myortho://knowledge/home', articleIds: ['pain-swelling', 'medicines', 'incision'],
    topics: ['pain', 'swelling', 'bruise', 'warmth', 'ice', 'elevation', 'medicine', 'incision', 'wound', 'dressing'],
    content: 'Pain, bruising, warmth, stiffness, and swelling can occur after knee replacement and may vary by day or increase after activity. Use medicines, cold therapy, elevation, movement, and compression only as directed. Follow the discharge medication list and do not add over-the-counter medicine, alcohol, supplements, sleep aids, or old prescriptions without checking with the care team or pharmacist. Follow individual dressing and incision instructions. Promptly report fever, increasing redness or tenderness, wound opening or drainage, worsening or uncontrolled pain, or bleeding that soaks the dressing.',
  },
  {
    sourceId: 'myortho-rehabilitation', title: 'Rehabilitation and Progress', publisher: 'MyOrtho Companion',
    url: 'myortho://knowledge/rehab', articleIds: ['role-pt', 'recovery-varies', 'walking-aids'],
    topics: ['physical therapy', 'exercise', 'range motion', 'walking', 'walker', 'cane', 'crutches', 'recovery', 'progress'],
    content: 'Rehabilitation may address walking, transfers, balance, strength, and knee motion. Exercise choice, frequency, and intensity depend on the person and the surgical plan; more is not always better. Recovery can vary from day to day and differs between people. A walking aid supports stability and reduces fall risk. Follow individual weight-bearing and device instructions rather than stopping an aid after a fixed number of days.',
  },
  {
    sourceId: 'myortho-long-term', title: 'Life With Your New Knee', publisher: 'MyOrtho Companion',
    url: 'myortho://knowledge/long-term', articleIds: ['returning', 'protect-knee'],
    topics: ['drive', 'work', 'travel', 'activity', 'exercise', 'dental', 'antibiotic', 'fall', 'long term'],
    content: 'Return to work, driving, travel, chores, and recreation depends on healing, strength, medicine use, safe control, and activity demands—not the calendar alone. Do not drive while taking medicine that impairs alertness. Ask the surgeon before higher-risk or impact activities. Reduce falls with clear floors, supportive footwear, handrails, and recommended aids. Tell dentists and other clinicians about the joint replacement. Antibiotic recommendations before dental work differ between patients; ask the orthopedic surgeon.',
  },
  {
    sourceId: 'aaos-total-knee-replacement', title: 'Total Knee Replacement', publisher: 'AAOS OrthoInfo',
    url: 'https://orthoinfo.aaos.org/en/treatment/total-knee-replacement/', articleIds: ['what-is-replaced', 'total-partial', 'pain-swelling'],
    topics: ['replacement', 'implant', 'procedure', 'complication', 'blood clot', 'infection', 'driving', 'fall'],
    content: 'AAOS describes knee replacement as removal of damaged cartilage and a small amount of underlying bone, followed by placement of metal components and a plastic spacer. Recovery guidance emphasizes following surgeon and physical therapist instructions. Possible clot signs include increasing calf pain, tenderness or redness above or below the knee, and new or increasing calf, ankle, or foot swelling. Possible pulmonary embolism signs include sudden shortness of breath and sudden chest pain, including localized pain with coughing. Infection warning signs include persistent fever, chills, increasing wound redness, tenderness or swelling, drainage, and increasing knee pain with activity and rest. Falls in the early weeks can damage the new knee.',
  },
  {
    sourceId: 'aaos-activities-after-replacement', title: 'Activities After Total Knee Replacement', publisher: 'AAOS OrthoInfo',
    url: 'https://orthoinfo.aaos.org/en/recovery/activities-after-knee-replacement/', articleIds: ['role-pt', 'walking-aids', 'returning', 'protect-knee'],
    topics: ['activity', 'walking', 'stairs', 'exercise', 'medicine', 'swelling', 'infection', 'blood clot', 'dental'],
    content: 'AAOS patient guidance describes discharge readiness in terms of safe mobility, acceptable pain control, basic self-care, prescribed exercises, and understanding precautions. Patients should use prescribed assistive devices until balance, flexibility, and strength improve. New or severe swelling should be reported because it can be a clot warning sign. Take medicines as directed and ask before combining prescription medicines with over-the-counter drugs, supplements, vitamins, or alcohol. Ask the orthopedic surgeon whether antibiotics are needed before dental work.',
  },
  {
    sourceId: 'medlineplus-knee-discharge', title: 'Knee Joint Replacement—Discharge', publisher: 'MedlinePlus',
    url: 'https://medlineplus.gov/ency/patientinstructions/000170.htm', articleIds: ['pain-swelling', 'medicines', 'incision', 'walking-aids'],
    topics: ['discharge', 'home', 'wound', 'medicine', 'walker', 'blood clot', 'calf', 'emergency'],
    content: 'MedlinePlus advises following surgeon or physical therapist instructions for weight bearing and walking aids, taking medicines exactly as directed, and checking the wound for infection signs. Contact the surgeon for bleeding that soaks the dressing and does not stop with pressure, uncontrolled pain, calf pain or swelling, a foot or toes that become darker or cool, wound discharge, fever, increasing incision redness or swelling, chest pain, or breathing problems. Chest pain or breathing difficulty may require emergency help.',
  },
  {
    sourceId: 'medlineplus-knee-replacement', title: 'Knee Replacement', publisher: 'MedlinePlus',
    url: 'https://medlineplus.gov/kneereplacement.html', articleIds: ['knee-basics', 'what-is-replaced', 'recovery-varies'],
    topics: ['overview', 'replacement', 'risk', 'recovery', 'arthritis'],
    content: 'MedlinePlus provides general knee replacement education and links to patient instructions. Individual age, health, activity, the reason for surgery, and the care plan can affect risks and recovery. General educational information should not substitute for instructions from the patient’s own surgical team.',
  },
];

const STOP_WORDS = new Set(['about', 'after', 'again', 'also', 'been', 'before', 'being', 'could', 'does', 'from', 'have', 'into', 'just', 'more', 'should', 'that', 'their', 'there', 'these', 'they', 'this', 'what', 'when', 'where', 'which', 'with', 'would', 'your']);

function terms(value: string): string[] {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}

export function retrieveMyOrthoSources(query: string, limit = 5): MyOrthoSource[] {
  const queryTerms = new Set(terms(query));
  return MYORTHO_SOURCES.map((source) => {
    const title = source.title.toLowerCase();
    const topicSet = new Set(source.topics.flatMap(terms));
    const contentSet = new Set(terms(source.content));
    let score = 0;
    for (const term of queryTerms) {
      if (title.includes(term)) score += 5;
      if (topicSet.has(term)) score += 4;
      if (contentSet.has(term)) score += 1;
    }
    return { source, score };
  }).filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ source }) => source);
}

export function sourceById(sourceId: string) {
  return MYORTHO_SOURCES.find((source) => source.sourceId === sourceId);
}
