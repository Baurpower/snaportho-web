import assert from 'node:assert/strict';

import {
  BroBotReadingRecommendationSchema,
  type BroBotReadingResourceRow,
} from './types';
import { loadReadingRecommendationCache } from './cache';
import { getReadingRecommendations } from './recommendation-engine';
import { buildPubMedQuery, retrievePubMedArticles } from './pubmed-client';
import { rankReadingResources } from './ranker';
import { getHybridReadingRecommendations, classifyArticle } from './retrieval-engine';
import { extractReadingTopicContext } from './topic-context';
import { isTrustedReadingUrl, verifyPubMedArticle, verifyPubMedResultForTopic } from './verifier';

const baseResource: BroBotReadingResourceRow = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'General Orthopaedic Review',
  resource_type: 'educational_website',
  source_name: 'Verified Source',
  journal: null,
  year: null,
  url: 'https://example.com/general',
  why_it_matters: 'A verified general review.',
  tags: ['orthopaedics'],
  modes: ['general'],
  procedure_categories: ['general_topic'],
  training_level_min: 'med_student',
  training_level_max: 'pgy5',
  educational_yield: 50,
  landmark_score: 0,
  board_relevance: 0,
  clinical_relevance: 50,
  technique_relevance: 0,
  access: 'free',
  editorial_status: 'verified',
};

const exactScfe: BroBotReadingResourceRow = {
  ...baseResource,
  id: '22222222-2222-4222-8222-222222222222',
  title: 'SCFE Review',
  url: 'https://example.com/scfe',
  tags: ['scfe', 'slipped capital femoral epiphysis', 'oite'],
  modes: ['oite'],
  educational_yield: 85,
  board_relevance: 90,
};

const partialHip: BroBotReadingResourceRow = {
  ...baseResource,
  id: '33333333-3333-4333-8333-333333333333',
  title: 'Pediatric Hip Review',
  url: 'https://example.com/hip',
  tags: ['hip', 'pediatrics'],
  modes: ['clinic'],
  educational_yield: 80,
  board_relevance: 50,
};

const femoralNeck: BroBotReadingResourceRow = {
  ...baseResource,
  id: '66666666-6666-4666-8666-666666666666',
  title: 'Femoral Neck Fractures',
  url: 'https://example.com/femoral-neck',
  tags: [
    'femoral_neck_fracture',
    'femoral_neck',
    'garden_classification',
    'pauwels_classification',
  ],
  modes: ['clinic', 'consult', 'oite'],
  educational_yield: 88,
  board_relevance: 82,
  clinical_relevance: 90,
};

const ddh: BroBotReadingResourceRow = {
  ...baseResource,
  id: '77777777-7777-4777-8777-777777777777',
  title: 'Developmental Dysplasia of the Hip',
  url: 'https://example.com/ddh',
  tags: ['ddh', 'developmental_dysplasia_hip', 'barlow', 'ortolani', 'acetabular_index'],
  modes: ['clinic', 'oite'],
  educational_yield: 84,
  board_relevance: 88,
};

const perthes: BroBotReadingResourceRow = {
  ...baseResource,
  id: '88888888-8888-4888-8888-888888888888',
  title: 'Legg-Calve-Perthes Disease',
  url: 'https://example.com/perthes',
  tags: ['perthes', 'legg_calve_perthes', 'containment'],
  modes: ['clinic', 'oite'],
  educational_yield: 82,
  board_relevance: 84,
};

const rotatorCuff: BroBotReadingResourceRow = {
  ...baseResource,
  id: '99999999-9999-4999-8999-999999999999',
  title: 'Rotator Cuff Tears',
  url: 'https://example.com/rotator-cuff',
  tags: ['rotator_cuff', 'rotator_cuff_tear', 'supraspinatus'],
  modes: ['clinic', 'oite'],
  educational_yield: 76,
};

const acl: BroBotReadingResourceRow = {
  ...baseResource,
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: 'ACL Injuries',
  url: 'https://example.com/acl',
  tags: ['acl', 'anterior_cruciate_ligament', 'acl_tear'],
  modes: ['clinic', 'oite'],
  educational_yield: 78,
};

const carpalTunnel: BroBotReadingResourceRow = {
  ...baseResource,
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  title: 'Carpal Tunnel Syndrome',
  url: 'https://example.com/carpal-tunnel',
  tags: ['carpal_tunnel', 'carpal_tunnel_syndrome', 'median_nerve'],
  modes: ['clinic', 'general'],
  educational_yield: 78,
};

const distalRadius: BroBotReadingResourceRow = {
  ...baseResource,
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  title: 'Distal Radius Fractures',
  url: 'https://example.com/distal-radius',
  tags: ['distal_radius', 'distal_radius_fracture', 'wrist_fracture'],
  modes: ['clinic', 'consult', 'oite'],
  educational_yield: 80,
};

const landmark: BroBotReadingResourceRow = {
  ...baseResource,
  id: '44444444-4444-4444-8444-444444444444',
  title: 'Classic Classification Resource',
  url: 'https://example.com/classic',
  tags: ['scfe', 'classification'],
  modes: ['oite'],
  educational_yield: 70,
  landmark_score: 95,
  board_relevance: 85,
};

const unverified: BroBotReadingResourceRow = {
  ...exactScfe,
  id: '55555555-5555-4555-8555-555555555555',
  url: 'https://example.com/unverified',
  editorial_status: 'draft',
};

assert.throws(() =>
  BroBotReadingRecommendationSchema.parse({
    id: exactScfe.id,
    title: '',
    resourceType: 'educational_website',
    sourceName: 'Verified Source',
    url: 'https://example.com/scfe',
    whyItMatters: 'Useful.',
    tags: [],
    rankScore: 1,
    rankPosition: 1,
  })
);

assert.throws(() =>
  BroBotReadingRecommendationSchema.parse({
    id: exactScfe.id,
    title: 'SCFE Review',
    resourceType: 'made_up_type',
    sourceName: 'Verified Source',
    url: 'https://example.com/scfe',
    whyItMatters: 'Useful.',
    tags: [],
    rankScore: 1,
    rankPosition: 1,
  })
);

assert.throws(() =>
  BroBotReadingRecommendationSchema.parse({
    id: exactScfe.id,
    title: 'SCFE Review',
    resourceType: 'educational_website',
    sourceName: 'Verified Source',
    url: '',
    whyItMatters: 'Useful.',
    tags: [],
    rankScore: 1,
    rankPosition: 1,
  })
);

const ranked = rankReadingResources(
  [partialHip, exactScfe, baseResource],
  {
    mode: 'oite',
    trainingLevel: 'pgy2',
    topic: 'SCFE',
    tags: ['scfe', 'pediatrics'],
  },
  3
);

assert.equal(ranked[0]?.id, exactScfe.id);
assert.ok((ranked[0]?.rankScore ?? 0) > (ranked[1]?.rankScore ?? 0));

const modeRanked = rankReadingResources(
  [
    { ...exactScfe, modes: ['clinic'], url: 'https://example.com/scfe-clinic' },
    { ...exactScfe, id: landmark.id, url: landmark.url, modes: ['oite'] },
  ],
  {
    mode: 'oite',
    trainingLevel: 'pgy2',
    topic: 'SCFE',
    tags: ['scfe'],
  },
  2
);

assert.equal(modeRanked[0]?.id, landmark.id);

const landmarkRanked = rankReadingResources(
  [exactScfe, landmark],
  {
    mode: 'oite',
    trainingLevel: 'pgy2',
    topic: 'SCFE classification',
    tags: ['scfe', 'classification'],
  },
  2
);

assert.equal(landmarkRanked[0]?.id, landmark.id);
assert.equal(landmarkRanked[0]?.isLandmark, true);

const femoralNeckTopic = extractReadingTopicContext({
  structuredJson: {
    detectedMode: 'clinic',
    tags: ['trauma:femoral neck fracture', 'mode:clinic'],
  },
  latestUserMessage: 'What should I read for femoral neck?',
  fallbackTrainingLevel: 'pgy2',
});

assert.equal(femoralNeckTopic.topicKey, 'femoral_neck_fracture');
assert.match(buildPubMedQuery(femoralNeckTopic), /"femoral neck fracture"\[Title\/Abstract\]/);
assert.match(buildPubMedQuery(femoralNeckTopic), /review\[Publication Type\]/);
assert.match(buildPubMedQuery(femoralNeckTopic), /systematic review\[Publication Type\]/);
assert.match(buildPubMedQuery(femoralNeckTopic), /meta-analysis\[Publication Type\]/);
assert.match(buildPubMedQuery(femoralNeckTopic), /guideline\[Publication Type\]/);
assert.match(buildPubMedQuery(femoralNeckTopic), /NOT \(case reports\[Publication Type\]/);
assert.match(buildPubMedQuery(femoralNeckTopic, 'All Fields'), /"femoral neck fracture"\[All Fields\]/);

assert.equal(isTrustedReadingUrl('https://orthoinfo.aaos.org/en/diseases--conditions/foo'), true);
assert.equal(isTrustedReadingUrl('https://example.com/fake-orthopedics'), false);

assert.equal(
  verifyPubMedArticle(
    {
      pmid: '12345',
      title: 'Femoral neck fracture treatment and Garden classification',
      authors: ['Tester A'],
      journal: 'J Orthop Test',
      year: 2024,
      publicationTypes: ['Review'],
      url: 'https://pubmed.ncbi.nlm.nih.gov/12345/',
    },
    femoralNeckTopic
  ),
  true
);

assert.equal(
  verifyPubMedArticle(
    {
      pmid: '',
      title: 'Femoral neck fracture treatment',
      authors: [],
      journal: 'J Orthop Test',
      year: 2024,
      publicationTypes: ['Review'],
      url: 'https://pubmed.ncbi.nlm.nih.gov/12345/',
    },
    femoralNeckTopic
  ),
  false
);

const intertrochTopic = extractReadingTopicContext({
  structuredJson: {
    detectedMode: 'consult',
    tags: ['trauma:hip fracture'],
  },
  latestUserMessage: 'Read next for intertrochanteric fracture treatment',
  fallbackTrainingLevel: 'pgy2',
});

assert.equal(intertrochTopic.topicKey, 'intertrochanteric_femur_fracture');
const intertrochQuery = buildPubMedQuery(intertrochTopic);
assert.match(intertrochQuery, /"intertrochanteric fracture"\[Title\/Abstract\]/);
assert.match(intertrochQuery, /"pertrochanteric fracture"\[Title\/Abstract\]/);
assert.match(intertrochQuery, /"extracapsular hip fracture"\[Title\/Abstract\]/);
assert.doesNotMatch(intertrochQuery, /cephalomedullary nail/);
assert.doesNotMatch(intertrochQuery, /avascular necrosis/);

const acceptedIntertroch = verifyPubMedResultForTopic(
  {
    pmid: '24680',
    title: 'Cephalomedullary nails versus sliding hip screws for unstable intertrochanteric fractures',
    authors: ['Tester A'],
    journal: 'J Orthop Test',
    year: 2024,
    publicationTypes: ['Review'],
    abstractText: 'Treatment of unstable intertrochanteric fractures with cephalomedullary nail fixation.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/24680/',
  },
  intertrochTopic
);

assert.equal(acceptedIntertroch.accepted, true);
assert.ok(acceptedIntertroch.matchedTerms.includes('intertrochanteric fracture'));

const rejectedAvn = verifyPubMedResultForTopic(
  {
    pmid: '24681',
    title: 'Avascular necrosis after internal fixation of proximal femur fractures',
    authors: ['Tester A'],
    journal: 'J Orthop Test',
    year: 2024,
    publicationTypes: ['Review'],
    abstractText: 'AVN after reconstructive hip surgery in children with cerebral palsy.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/24681/',
  },
  intertrochTopic
);

assert.equal(rejectedAvn.accepted, false);
assert.equal(rejectedAvn.rejectionReason, 'excluded_topic_term');
assert.ok(rejectedAvn.rejectedTerms.some((term) => /avascular necrosis|AVN|cerebral palsy|children/.test(term)));

const rejectedFemoralNeck = verifyPubMedResultForTopic(
  {
    pmid: '24682',
    title: 'Femoral neck fracture fixation in older adults',
    authors: ['Tester A'],
    journal: 'J Orthop Test',
    year: 2024,
    publicationTypes: ['Review'],
    abstractText: 'Review of femoral neck fracture fixation and avascular necrosis.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/24682/',
  },
  intertrochTopic
);

assert.equal(rejectedFemoralNeck.accepted, false);

function topicFromMessage(message: string) {
  return extractReadingTopicContext({
    structuredJson: { detectedMode: 'clinic', tags: [] },
    latestUserMessage: message,
    fallbackTrainingLevel: 'pgy2',
  });
}

function verifyMockArticle(
  topic: ReturnType<typeof extractReadingTopicContext>,
  title: string,
  abstractText: string,
  pmid = '55555'
) {
  return verifyPubMedResultForTopic(
    {
      pmid,
      title,
      authors: ['Tester A'],
      journal: 'J Orthop Test',
      year: 2024,
      publicationTypes: ['Review'],
      abstractText,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    },
    topic
  );
}

const registryTopics = [
  {
    message: 'read next for femoral neck fracture',
    topicKey: 'femoral_neck_fracture',
    relevantTitle: 'Femoral neck fracture treatment and Garden classification',
    relevantAbstract: 'Review of femoral neck fracture fixation and arthroplasty treatment.',
    broadWrongTitle: 'Geriatric hip fracture mortality after surgery',
    broadWrongAbstract: 'Hip fracture co-management in older adults without intracapsular fracture details.',
    excludedTitle: 'Intertrochanteric fracture fixation review',
    excludedAbstract: 'Pertrochanteric fracture treatment and cephalomedullary nail fixation.',
  },
  {
    message: 'read next for SCFE',
    topicKey: 'scfe',
    relevantTitle: 'SCFE in situ fixation for stable slipped capital femoral epiphysis',
    relevantAbstract: 'Stable SCFE and unstable SCFE treatment review.',
    broadWrongTitle: 'Adult hip fracture treatment review',
    broadWrongAbstract: 'Geriatric intertrochanteric fracture and femoral neck fracture management.',
    excludedTitle: 'Adult hip fracture treatment review',
    excludedAbstract: 'Adult hip fracture management after intertrochanteric fracture.',
  },
  {
    message: 'read next for DDH',
    topicKey: 'ddh',
    relevantTitle: 'Developmental dysplasia of the hip screening and acetabular index',
    relevantAbstract: 'DDH screening with Barlow, Ortolani, and Pavlik harness treatment.',
    broadWrongTitle: 'Pediatric hip pain review',
    broadWrongAbstract: 'General pediatric hip disorders focused on pain, limp, and infection.',
    excludedTitle: 'Perthes disease containment treatment',
    excludedAbstract: 'Legg-Calve-Perthes disease lateral pillar classification.',
  },
  {
    message: 'read next for prosthetic joint infection',
    topicKey: 'prosthetic_joint_infection',
    relevantTitle: 'Prosthetic joint infection diagnosis with MSIS criteria',
    relevantAbstract: 'Periprosthetic joint infection treatment with DAIR and two-stage exchange.',
    broadWrongTitle: 'Orthopaedic infection review',
    broadWrongAbstract: 'Native bone and joint infections without arthroplasty.',
    excludedTitle: 'Native septic arthritis aspiration and irrigation',
    excludedAbstract: 'Native septic arthritis treatment of the septic joint.',
  },
  {
    message: 'read next for rotator cuff tear',
    topicKey: 'rotator_cuff_tear',
    relevantTitle: 'Rotator cuff tear repair and retear after massive tear',
    relevantAbstract: 'Rotator cuff repair outcomes and subacromial decompression review.',
    broadWrongTitle: 'Sports medicine shoulder and knee injuries',
    broadWrongAbstract: 'General sports injury review focused on shoulder instability and knee injuries.',
    excludedTitle: 'ACL and meniscus tear reconstruction review',
    excludedAbstract: 'Anterior cruciate ligament reconstruction and meniscal repair.',
  },
  {
    message: 'read next for carpal tunnel syndrome',
    topicKey: 'carpal_tunnel_syndrome',
    relevantTitle: 'Carpal tunnel syndrome electrodiagnostic testing and release',
    relevantAbstract: 'Median nerve compression with night symptoms treated by carpal tunnel release.',
    broadWrongTitle: 'Common wrist pain review',
    broadWrongAbstract: 'General hand conditions focused on arthritis and tendinopathy.',
    excludedTitle: 'Distal radius and scaphoid fracture management',
    excludedAbstract: 'Volar plate fixation and scaphoid nonunion treatment.',
  },
  {
    message: 'read next for cervical myelopathy',
    topicKey: 'cervical_myelopathy',
    relevantTitle: 'Degenerative cervical myelopathy decompression and gait dysfunction',
    relevantAbstract: 'Cervical myelopathy causes hand clumsiness and myelopathic signs.',
    broadWrongTitle: 'Degenerative spine disease overview',
    broadWrongAbstract: 'Spine review focused on radiculopathy and deformity.',
    excludedTitle: 'Lumbar spinal stenosis decompression review',
    excludedAbstract: 'Lumbar stenosis and neurogenic claudication treated with laminectomy.',
  },
  {
    message: 'read next for distal radius fracture',
    topicKey: 'distal_radius_fracture',
    relevantTitle: 'Distal radius fracture volar plate fixation',
    relevantAbstract: 'Distal radius fracture treatment restores radial height and dorsal tilt.',
    broadWrongTitle: 'General wrist injury review',
    broadWrongAbstract: 'A broad wrist review focused on ligament sprains and tendinopathy.',
    excludedTitle: 'Carpal tunnel and scaphoid fracture review',
    excludedAbstract: 'Median nerve compression and scaphoid nonunion treatment.',
  },
];

for (const scenario of registryTopics) {
  const topic = topicFromMessage(scenario.message);
  assert.equal(topic.topicKey, scenario.topicKey);
  assert.equal(verifyMockArticle(topic, scenario.relevantTitle, scenario.relevantAbstract).accepted, true);
  assert.equal(verifyMockArticle(topic, scenario.broadWrongTitle, scenario.broadWrongAbstract, '55556').accepted, false);
  const excluded = verifyMockArticle(topic, scenario.excludedTitle, scenario.excludedAbstract, '55557');
  assert.equal(excluded.accepted, false);
  assert.ok(
    excluded.rejectionReason === 'excluded_topic_term' ||
      excluded.rejectionReason === 'insufficient_specific_topic_relevance'
  );
}

const ddhComparisonTopic = topicFromMessage('compare DDH versus Perthes disease');
assert.equal(
  verifyMockArticle(
    ddhComparisonTopic,
    'DDH versus Perthes disease in pediatric hip evaluation',
    'Developmental dysplasia of the hip and Perthes disease are compared using acetabular index and containment concepts.',
    '55558'
  ).accepted,
  true
);

const pjiComparisonTopic = topicFromMessage('compare prosthetic joint infection versus native septic arthritis');
assert.equal(
  verifyMockArticle(
    pjiComparisonTopic,
    'Prosthetic joint infection versus native septic arthritis diagnosis',
    'PJI diagnosis using MSIS criteria is compared with native septic arthritis aspiration.',
    '55559'
  ).accepted,
  true
);

const cervicalComparisonTopic = topicFromMessage('compare cervical myelopathy versus lumbar stenosis');
assert.equal(
  verifyMockArticle(
    cervicalComparisonTopic,
    'Cervical myelopathy versus lumbar spinal stenosis',
    'Degenerative cervical myelopathy gait findings are compared with lumbar stenosis and neurogenic claudication.',
    '55560'
  ).accepted,
  true
);

assert.equal(
  verifyPubMedArticle(
    {
      pmid: '99999',
      title: 'Developmental dysplasia of the hip screening',
      authors: ['Tester A'],
      journal: 'J Orthop Test',
      year: 2024,
      publicationTypes: ['Review'],
      url: 'https://pubmed.ncbi.nlm.nih.gov/99999/',
    },
    femoralNeckTopic
  ),
  false
);

async function runAsyncAssertions() {
  const noFabrication = await getReadingRecommendations({
    supabase: {} as never,
    context: {
      mode: 'oite',
      trainingLevel: 'pgy2',
      topic: 'unknown topic',
      tags: ['unknown topic'],
    },
    repository: {
      loadVerifiedReadingResources: async () => [],
    },
  });

  assert.deepEqual(noFabrication, []);

  const pubmedCalls: string[] = [];
  const mockFetch = async (url: string | URL | Request) => {
    const value = String(url);
    pubmedCalls.push(value);
    if (value.includes('esearch.fcgi')) {
      return {
        ok: true,
        json: async () => ({ esearchresult: { idlist: ['12345'] } }),
      } as Response;
    }

      if (value.includes('efetch.fcgi')) {
        return {
          ok: true,
          text: async () => '<PubmedArticleSet />',
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({
        result: {
          uids: ['12345'],
          '12345': {
            uid: '12345',
            title: 'Femoral neck fracture treatment review',
            fulljournalname: 'Journal of Orthopaedic Reviews',
            pubdate: '2024 Jan',
            pubtype: ['Review'],
            authors: [{ name: 'Tester A' }],
            articleids: [{ idtype: 'doi', value: '10.1000/test' }],
          },
        },
      }),
    } as Response;
  };
  const articles = await retrievePubMedArticles({
    topic: femoralNeckTopic,
    fetchImpl: mockFetch,
  });

  assert.equal(articles[0]?.pmid, '12345');
  assert.equal(articles[0]?.url, 'https://pubmed.ncbi.nlm.nih.gov/12345/');
  assert.ok(pubmedCalls.some((url) => url.includes('esearch.fcgi')));
  assert.ok(pubmedCalls.some((url) => url.includes('esummary.fcgi')));

  const cached = await loadReadingRecommendationCache({
    topic: femoralNeckTopic,
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            gt: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
                      generated_from: 'live',
                      verified_at: new Date().toISOString(),
                      resources: [
                        {
                          id: 'pubmed-12345',
                          title: 'Femoral neck fracture treatment review',
                          resourceType: 'review_article',
                          sourceName: 'PubMed',
                          year: 2024,
                          url: 'https://pubmed.ncbi.nlm.nih.gov/12345/',
                          pmid: '12345',
                          whyItMatters: 'Verified.',
                          tags: ['femoral_neck_fracture'],
                          access: 'abstract_only',
                          rankPosition: 1,
                          rankScore: 90,
                        },
                      ],
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    } as never,
  });

  assert.equal(cached?.resources[0]?.pmid, '12345');

  const badIntertrochCache = await loadReadingRecommendationCache({
    topic: intertrochTopic,
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            gt: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
                      generated_from: 'live',
                      verified_at: new Date().toISOString(),
                      resources: [
                        {
                          id: 'pubmed-24681',
                          title: 'AVN after reconstructive hip surgery in children with cerebral palsy',
                          resourceType: 'review_article',
                          sourceName: 'PubMed',
                          year: 2024,
                          url: 'https://pubmed.ncbi.nlm.nih.gov/24681/',
                          pmid: '24681',
                          whyItMatters: 'Bad cache.',
                          tags: ['intertrochanteric_femur_fracture'],
                          access: 'abstract_only',
                          rankPosition: 1,
                          rankScore: 90,
                        },
                      ],
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    } as never,
  });

  assert.equal(badIntertrochCache, null);

  const searchCalls: string[] = [];
  const searched = await getHybridReadingRecommendations({
    topic: femoralNeckTopic,
    fetchImpl: (async (url: string | URL | Request) => {
      const value = String(url);
      searchCalls.push(value);
      if (value.includes('esearch.fcgi')) {
        return {
          ok: true,
          json: async () => ({ esearchresult: { idlist: ['12345', '67890'] } }),
        } as Response;
      }
      if (value.includes('efetch.fcgi')) {
        return {
          ok: true,
          text: async () => `
            <PubmedArticle><MedlineCitation><PMID>12345</PMID><Article><Abstract><AbstractText>Femoral neck fracture fixation evidence.</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>
            <PubmedArticle><MedlineCitation><PMID>67890</PMID><Article><Abstract><AbstractText>Geriatric hip fracture care.</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>
          `,
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          result: {
            uids: ['12345', '67890'],
            '12345': {
              uid: '12345',
              title: 'Femoral neck fracture treatment review',
              fulljournalname: 'Journal of Orthopaedic Reviews',
              pubdate: '2024 Jan',
              pubtype: ['Review'],
              authors: [{ name: 'Tester A' }],
            },
            '67890': {
              uid: '67890',
              title: 'Geriatric hip fracture treatment review',
              fulljournalname: 'Journal of Orthopaedic Reviews',
              pubdate: '2024 Jan',
              pubtype: ['Review'],
              authors: [{ name: 'Tester B' }],
            },
          },
        }),
      } as Response;
    }) as typeof fetch,
    supabase: {} as never,
  });

  assert.equal(searched.generatedFrom, 'live');
  assert.equal(searched.resources.length, 1);
  assert.equal(searched.resources[0]?.pmid, '12345');
  assert.ok(searchCalls.some((url) => url.includes('%22femoral+neck+fracture%22%5BTitle%2FAbstract%5D')));

  const qualityFetch = async (url: string | URL | Request) => {
    const value = String(url);
    if (value.includes('esearch.fcgi')) {
      return {
        ok: true,
        json: async () => ({ esearchresult: { idlist: ['111', '222', '333', '444', '555', '666'] } }),
      } as Response;
    }
    if (value.includes('efetch.fcgi')) {
      return {
        ok: true,
        text: async () => `
          <PubmedArticle><MedlineCitation><PMID>111</PMID><Article><Abstract><AbstractText>Femoral neck fracture treatment and management review.</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>
          <PubmedArticle><MedlineCitation><PMID>222</PMID><Article><Abstract><AbstractText>Femoral neck fracture with obturator dislocation case report.</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>
          <PubmedArticle><MedlineCitation><PMID>333</PMID><Article><Abstract><AbstractText>Systematic review of femoral neck fracture outcomes.</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>
          <PubmedArticle><MedlineCitation><PMID>444</PMID><Article><Abstract><AbstractText>Femoral neck fracture case series.</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>
          <PubmedArticle><MedlineCitation><PMID>555</PMID><Article><Abstract><AbstractText>Femoral neck fracture treatment review.</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>
          <PubmedArticle><MedlineCitation><PMID>666</PMID><Article><Abstract><AbstractText>Hip fixation with no exact topic overlap.</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>
        `,
      } as Response;
    }
    return {
      ok: true,
      json: async () => ({
        result: {
          uids: ['111', '222', '333', '444', '555', '666'],
          '111': {
            uid: '111',
            title: 'Femoral neck fracture management review',
            fulljournalname: 'The Journal of bone and joint surgery. American volume',
            pubdate: '2019 Jan',
            pubtype: ['Review'],
            authors: [{ name: 'Tester A' }],
          },
          '222': {
            uid: '222',
            title: 'Obturator dislocation of hip with femoral neck fracture: a case report',
            fulljournalname: 'Case Reports in Orthopedics',
            pubdate: '2024 Jan',
            pubtype: ['Case Reports'],
            authors: [{ name: 'Tester B' }],
          },
          '333': {
            uid: '333',
            title: 'Femoral neck fracture outcomes: a systematic review',
            fulljournalname: 'The Lancet',
            pubdate: '2021 Jan',
            pubtype: ['Systematic Review'],
            authors: [{ name: 'Tester C' }],
          },
          '444': {
            uid: '444',
            title: 'Femoral neck fracture fixation case series',
            fulljournalname: 'The Journal of bone and joint surgery. American volume',
            pubdate: '2022 Jan',
            pubtype: ['Journal Article'],
            authors: [{ name: 'Tester D' }],
          },
          '555': {
            uid: '555',
            title: 'Femoral neck fracture current concepts review',
            fulljournalname: 'The Journal of bone and joint surgery. American volume',
            pubdate: '2019 Jan',
            pubtype: ['Review'],
            authors: [{ name: 'Tester E' }],
          },
          '666': {
            uid: '666',
            title: 'Hip fixation review with high citations',
            fulljournalname: 'The Journal of bone and joint surgery. American volume',
            pubdate: '2019 Jan',
            pubtype: ['Review'],
            authors: [{ name: 'Tester F' }],
          },
        },
      }),
    } as Response;
  };

  const citationFetch = async (url: string | URL | Request) => {
    const pmid = /ids\.pmid%3A(\d+)/.exec(String(url))?.[1] ?? /ids\.pmid:(\d+)/.exec(String(url))?.[1];
    const counts: Record<string, number> = {
      '111': 20,
      '222': 900,
      '333': 30,
      '444': 10,
      '555': 300,
      '666': 2000,
    };
    return {
      ok: true,
      json: async () => ({ results: [{ cited_by_count: counts[pmid ?? ''] ?? 0 }] }),
    } as Response;
  };

  const qualityResults = await getHybridReadingRecommendations({
    topic: femoralNeckTopic,
    fetchImpl: qualityFetch as typeof fetch,
    citationFetchImpl: citationFetch as typeof fetch,
    supabase: {} as never,
    max: 5,
  });

  const pmids = qualityResults.resources.map((resource) => resource.pmid);
  assert.equal(pmids.includes('222'), false);
  assert.equal(pmids.includes('666'), false);
  assert.ok(pmids.indexOf('333') < pmids.indexOf('444'));
  assert.ok(pmids.indexOf('555') < pmids.indexOf('111'));
  assert.ok(qualityResults.resources[0]?.badges?.includes('High-impact journal'));
  assert.ok(qualityResults.resources.some((resource) => resource.badges?.includes('Highly cited')));
  assert.equal(classifyArticle({
    title: 'Femoral neck fracture case report',
    abstractText: '',
    publicationTypes: ['Case Reports'],
  }), 'case_report');
}

const excludesDraft = rankReadingResources(
  [unverified],
  {
    mode: 'oite',
    trainingLevel: 'pgy2',
    topic: 'SCFE',
    tags: ['scfe'],
  },
  1
);

assert.deepEqual(excludesDraft, []);

const femoralNeckRanked = rankReadingResources(
  [ddh, perthes, exactScfe, femoralNeck],
  {
    mode: 'clinic',
    trainingLevel: 'pgy2',
    topic: 'femoral neck',
    tags: ['hip', 'fracture'],
  },
  5
);

assert.deepEqual(
  femoralNeckRanked.map((resource) => resource.id),
  [femoralNeck.id]
);

const ddhRanked = rankReadingResources(
  [ddh, femoralNeck],
  {
    mode: 'clinic',
    trainingLevel: 'pgy1',
    topic: 'DDH',
    tags: ['pediatric hip', 'hip'],
  },
  5
);

assert.equal(ddhRanked[0]?.id, ddh.id);
assert.equal(ddhRanked.some((resource) => resource.id === femoralNeck.id), false);

const perthesRanked = rankReadingResources(
  [perthes, ddh],
  {
    mode: 'clinic',
    trainingLevel: 'pgy1',
    topic: 'Perthes',
    tags: ['pediatric hip', 'hip'],
  },
  5
);

assert.deepEqual(
  perthesRanked.map((resource) => resource.id),
  [perthes.id]
);

const rotatorCuffRanked = rankReadingResources(
  [acl, rotatorCuff],
  {
    mode: 'clinic',
    trainingLevel: 'pgy2',
    topic: 'rotator cuff',
    tags: ['shoulder', 'sports'],
  },
  5
);

assert.deepEqual(
  rotatorCuffRanked.map((resource) => resource.id),
  [rotatorCuff.id]
);

const carpalTunnelRanked = rankReadingResources(
  [distalRadius, carpalTunnel],
  {
    mode: 'clinic',
    trainingLevel: 'pgy1',
    topic: 'carpal tunnel',
    tags: ['hand', 'wrist'],
  },
  5
);

assert.deepEqual(
  carpalTunnelRanked.map((resource) => resource.id),
  [carpalTunnel.id]
);

runAsyncAssertions()
  .then(() => {
    console.log('BroBot Read Next tests passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
