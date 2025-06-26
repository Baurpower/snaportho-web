'use client';

import React, { useState } from 'react';
import {
  EyeIcon,
  MapPinIcon,
  PencilSquareIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';

/*───────────────── Reusable Step Card – declared OUTSIDE component ─────────────────*/
function StepCard({
  id,
  icon: Icon,
  title,
  description,
  example,
  children,
}: {
  id: number;
  icon: React.ElementType;
  title: string;
  description: string;
  example: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#d6d2c7] bg-[#fefdfb] px-6 py-8 shadow-sm space-y-4">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600/10 ring-1 ring-teal-500/30">
          <Icon className="h-6 w-6 text-teal-600" />
        </span>
        <h2 className="text-xl font-semibold text-[#1A1C2C]">{`Step ${id}: ${title}`}</h2>
      </div>
      <p className="text-sm text-[#555] leading-snug">
        {description}
        <br />
        <span className="italic text-teal-700">Example: “{example}”</span>
      </p>
      {children}
    </div>
  );
}

/*────────────────────────── Page Component ──────────────────────────*/
export default function ReadXrayPage() {
  const [views, setViews] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [maturity, setMaturity] = useState('');
  const [descriptors, setDescriptors] = useState<Record<string, string>>({});
  const [diagnosis, setDiagnosis] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [showImg, setShowImg] = useState<Record<string, boolean>>({});

  const descriptorInfo: Record<string, { def: string; img?: string }> = {
    displaced: { def: 'Fragments are separated. Include % + direction.', img: '/images/descriptors/displacement.png' },
    shortened: { def: 'Bone overlap → length loss (e.g., 5 mm).', img: '' },
    angulated: { def: 'Give apex dir + degrees (e.g., 20° dorsal).', img: '/images/descriptors/angulation.jpg' },
    'intra-articular': { def: 'Into joint – note step-off (e.g., 2 mm).', img: '' },
    comminuted: { def: '≥ 3 fragments – high-energy.', img: '' },
    open: { def: 'Skin breached – add Gustilo grade.', img: '' },
    incomplete: { def: 'Doesn’t cross both cortices.' },
  };
  const descriptorKeys = Object.keys(descriptorInfo);

  /*───────── Sentence preview ─────────*/
  const descriptorStr = Object.entries(descriptors)
    .map(([d, mod]) => (mod ? `${mod} ${d}` : d))
    .join(', ');

  const ready = views.length && location && maturity && diagnosis;
  const sentence = ready
    ? `${views.join(' and ')} of the ${location} in a ${maturity} individual demonstrates${
        descriptorStr ? ' a ' + descriptorStr : ''
      } ${diagnosis}.`
    : 'Complete each step to build your sentence.';

  /*───────── UI ─────────*/
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fefcf7] to-[#f5f2e8] text-[#1A1C2C] font-sans">
      <header className="pt-28 pb-16 px-6 text-center">
        <h1 className="text-4xl font-bold">Read Any Ortho X-Ray in 5 Steps</h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-[#4d5159]">
          Guided, clinically focused template—<span className="italic">zero fluff</span>, maximum clarity.
        </p>
      </header>

      <section className="px-6 sm:px-8 max-w-2xl mx-auto space-y-10 pb-24">
        {/* Step 1 */}
        <StepCard
          id={1}
          icon={EyeIcon}
          title="Views"
          description="List specific views you are reading (or number of views if unclear)."
          example="AP and lateral"
        >
          <div className="flex flex-wrap gap-3">
            {['AP', 'Lateral', 'Oblique', 'CT scout'].map((v) => (
              <label key={v} className="inline-flex items-center gap-2 text-sm text-[#4d5159]">
                <input
                  type="checkbox"
                  checked={views.includes(v)}
                  onChange={(e) =>
                    setViews((prev) => (e.target.checked ? [...prev, v] : prev.filter((x) => x !== v)))
                  }
                  className="accent-teal-600"
                />
                {v}
              </label>
            ))}
          </div>
        </StepCard>

        {/* Step 2 */}
        <StepCard
          id={2}
          icon={MapPinIcon}
          title="Location"
          description="Specify the side (left or right) and the bone or precise anatomic region involved."
          example="…of the left distal radius"
        >
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. right distal radius"
            className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:ring-2 focus:ring-teal-500"
          />
        </StepCard>

        {/* Step 3 */}
        <StepCard
          id={3}
          icon={PencilSquareIcon}
          title="Skeletal Maturity"
          description="Select mature vs immature."
          example="…in a skeletally immature individual"
        >
          <select
            value={maturity}
            onChange={(e) => setMaturity(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Select</option>
            <option value="skeletally mature">Skeletally mature</option>
            <option value="skeletally immature">Skeletally immature</option>
          </select>
        </StepCard>

        {/* Step 4 */}
        <StepCard
          id={4}
          icon={LightBulbIcon}
          title="Descriptors"
          description="Add key descriptors that are clinically significant—such as displacement, angulation, comminution, or joint involvement. Include modifiers (e.g., distance(mm),percent, degrees, direction) when applicable."
          example="…a 20° dorsally angulated fracture"
        >
          <div className="space-y-3 mb-4">
            {descriptorKeys.map((k) => {
              const needsMod = ['displaced', 'shortened', 'angulated', 'open', 'intra-articular'].includes(k);
              const placeholder: Record<string, string> = {
                displaced: 'e.g., 80% dorsal',
                angulated: 'e.g., 30° dorsal',
                shortened: 'e.g., 1 cm',
                open: 'e.g., Gustilo II',
                'intra-articular': 'e.g., 2 mm step-off',
              };
              return (
                <div key={k} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm min-w-[120px]">
                    <input
                      type="checkbox"
                      checked={k in descriptors}
                      onChange={(e) =>
                        setDescriptors((prev) => {
                          const next = { ...prev };
                          if (e.target.checked) next[k] = '';
                          else delete next[k];
                          return next;
                        })
                      }
                      className="accent-teal-600"
                    />
                    {k}
                  </label>
                  {needsMod && k in descriptors && (
                    <input
                      value={descriptors[k]}
                      onChange={(e) =>
                        setDescriptors((prev) => ({ ...prev, [k]: e.target.value }))
                      }
                      placeholder={placeholder[k]}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-1 text-sm shadow-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setShowDefinitions((p) => !p)}
            className="text-sm text-teal-700 hover:underline"
          >
            {showDefinitions ? 'Hide definitions' : 'Learn more'}
          </button>

          {showDefinitions && (
            <div className="mt-6 space-y-6 border-t pt-6">
              <h4 className="text-lg font-semibold">Descriptor Definitions</h4>
              {descriptorKeys.map((k) => (
                <div key={k} className="rounded border border-[#e2e0d7] bg-white/70 px-4 py-3 shadow-sm">
                  <div className="flex justify-between">
                    <span className="font-medium capitalize">{k}</span>
                    {descriptorInfo[k].img && (
                      <button
                        onClick={() => setShowImg((p) => ({ ...p, [k]: !p[k] }))}
                        className="text-xs text-teal-700 underline"
                      >
                        {showImg[k] ? 'Hide' : 'Show example'}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{descriptorInfo[k].def}</p>
                  {descriptorInfo[k].img && showImg[k] && (
                    <img
                      src={descriptorInfo[k].img}
                      alt={`${k} example`}
                      className="mt-3 w-full max-w-sm rounded border"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </StepCard>

        {/* Step 5 */}
        <StepCard
          id={5}
          icon={ClipboardDocumentIcon}
          title="Final Diagnosis"
          description="Combine everything into a concise diagnostic term."
          example="…a distal radius fracture"
        >
          <input
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. distal radius fracture"
            className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:ring-2 focus:ring-teal-500"
          />
        </StepCard>

        {/* Preview */}
        <div className="rounded-2xl border border-[#d0d0cc] bg-white/80 px-6 py-8 shadow-sm space-y-6 text-center">
          <h3 className="text-2xl font-semibold">Preview</h3>
          <p className="text-lg italic min-h-[3rem] flex items-center justify-center">{sentence}</p>
          <button
            disabled={!ready}
            onClick={() => {
              navigator.clipboard.writeText(sentence);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
            className="inline-flex items-center justify-center rounded-md border border-teal-500 px-4 py-2 text-teal-700 shadow-sm transition hover:bg-teal-50 disabled:opacity-50"
          >
            {copied ? <CheckIcon className="h-5 w-5 mr-2" /> : <ClipboardDocumentIcon className="h-5 w-5 mr-2" />}
            {copied ? 'Copied!' : 'Copy sentence'}
          </button>
        </div>
      </section>
    </main>
  );
}
