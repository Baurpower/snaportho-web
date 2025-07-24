'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import CountrySelect from './countryselect';

export interface UserProfile {
  full_name?: string;
  country?: string;
  city?: string;
  training_level?: string;
  institution?: string;
  receive_emails?: boolean; // ✅ updated key
  subspecialty_interest?: string;
  [key: string]: unknown;
}

const trainingLevels = [
  'Premed Student',
  'Surgical Tech',
  'RN',
  'PA Student',
  'NP Student',
  'PA-C',
  'NP',
  'MD/DO Student',
  'MD/DO Graduate',
  'MD/DO Resident',
  'MD/DO Fellow',
  'MD/DO Attending',
  'Other',
];

export default function ProfileForm({
  initialValues = {},
  mode = 'onboarding',
}: {
  initialValues?: UserProfile;
  mode?: 'onboarding' | 'update';
}) {
  const router = useRouter();

  const {
    full_name = '',
    country = '',
    city = '',
    training_level = '',
    institution = '',
    receive_emails = true, // ✅ updated key
    subspecialty_interest = '',
  } = initialValues;

  const [fullName, setFullName] = useState(full_name);
  const [userCountry, setCountry] = useState(country);
  const [userCity, setCity] = useState(city);
  const [trainingLevel, setTrainingLevel] = useState(training_level);
  const [userInstitution, setInstitution] = useState(institution);
  const [receiveEmails, setReceiveEmails] = useState(receive_emails); // ✅ updated key
  const [subspecialty, setSubspecialty] = useState(subspecialty_interest);

  const [trainingHistory, setTrainingHistory] = useState<
    { label: string; institution: string; graduation_date: string }[]
  >([]);

  useEffect(() => {
    let fields: string[] = [];

    if (['RN', 'NP', 'NP Student'].includes(trainingLevel)) {
      fields = ['Nursing School'];
    } else if (trainingLevel === 'MD/DO Student') {
      fields = ['Medical School'];
    } else if (trainingLevel === 'MD/DO Resident') {
      fields = ['Medical School', 'Residency'];
    } else if (trainingLevel === 'MD/DO Attending' || trainingLevel === 'MD/DO Fellow') {
      fields = ['Medical School', 'Residency', 'Fellowship'];
    } else if (['PA Student', 'PA-C'].includes(trainingLevel)) {
      fields = ['PA Program'];
    } else if (trainingLevel === 'Premed Student') {
      fields = ['Undergraduate Program'];
    }

    setTrainingHistory(
      fields.map((label) => ({
        label,
        institution: '',
        graduation_date: '',
      }))
    );
  }, [trainingLevel]);

  const updateTrainingField = (
    index: number,
    field: 'institution' | 'graduation_date',
    value: string
  ) => {
    const updated = [...trainingHistory];
    updated[index][field] = value;
    setTrainingHistory(updated);
  };

  const handleSubmit = async () => {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (!user || userErr) return alert('You must be logged in.');

    const { error: profileError } = await supabase.from('user_profiles').upsert({
      user_id: user.id,
      full_name: fullName,
      country: userCountry,
      city: userCity,
      training_level: trainingLevel,
      institution: userInstitution,
      receive_emails: receiveEmails, // ✅ fixed key
      subspecialty_interest: subspecialty,
    });

    if (profileError) {
      console.error(profileError);
      return alert('Failed to save profile');
    }

    if (mode === 'onboarding') {
      const validTrainings = trainingHistory.filter(
        (t) => t.institution && t.graduation_date
      );

      if (validTrainings.length > 0) {
        const insertPayload = validTrainings.map((t) => ({
          id: uuidv4(),
          user_id: user.id,
          institution: t.institution,
          role: t.label,
          graduation_date: t.graduation_date,
        }));

        const { error: trainingError } = await supabase
          .from('user_training_history')
          .insert(insertPayload);

        if (trainingError) {
          console.error(trainingError);
          return alert('Failed to save training history');
        }
      }
    }

    router.push(mode === 'update' ? '/learn' : '/onboarding/complete');
  };

  const inputClass =
    'w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky focus:outline-none';


  return (
  <div className="space-y-10">
    <div className="space-y-2">
      <h1 className="text-3xl font-bold text-navy">
        {mode === 'onboarding' ? 'Set Up Your Profile' : 'Update Your Profile'}
      </h1>
      <p className="text-midnight/70 text-sm">
        This information helps us personalize your experience.
      </p>
    </div>

    <div className="space-y-8">
      <div className="grid gap-6">
        <FormField label="Full Name">
          <input
            type="text"
            placeholder="Full Name"
            className={inputClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </FormField>

        <FormField label="Country">
          <CountrySelect value={userCountry} onChange={setCountry} />
        </FormField>

        <FormField label="City">
          <input
            type="text"
            placeholder="City"
            className={inputClass}
            value={userCity}
            onChange={(e) => setCity(e.target.value)}
          />
        </FormField>

        <FormField label="Training Level">
          <select
            value={trainingLevel}
            onChange={(e) => setTrainingLevel(e.target.value)}
            className={inputClass}
          >
            <option value="">Select your training level</option>
            {trainingLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Current Institution">
          <input
            type="text"
            placeholder="Institution"
            className={inputClass}
            value={userInstitution}
            onChange={(e) => setInstitution(e.target.value)}
          />
        </FormField>

        <FormField label="Subspecialty Interest">
          <input
            type="text"
            placeholder="Subspecialty"
            className={inputClass}
            value={subspecialty}
            onChange={(e) => setSubspecialty(e.target.value)}
          />
        </FormField>

        <div className="flex items-start gap-3 pt-2">
          <input
            type="checkbox"
            checked={receiveEmails}
            onChange={(e) => setReceiveEmails(e.target.checked)}
            className="mt-1 w-4 h-4"
          />
          <label className="text-sm font-medium text-midnight/80 leading-snug">
            Receive occasional email updates about new content and features
          </label>
        </div>
      </div>

      {trainingHistory.length > 0 && mode === 'onboarding' && (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-navy">Training History</h2>
          {trainingHistory.map((t, index) => (
            <div
              key={index}
              className="border border-gray-200 bg-white p-5 rounded-xl space-y-3"
            >
              <p className="text-sm font-medium text-midnight/70">{t.label}</p>
              <input
                type="text"
                placeholder={`${t.label} Name`}
                className={inputClass}
                value={t.institution}
                onChange={(e) =>
                  updateTrainingField(index, 'institution', e.target.value)
                }
              />
              <input
                type="date"
                className={inputClass}
                value={t.graduation_date}
                onChange={(e) =>
                  updateTrainingField(index, 'graduation_date', e.target.value)
                }
              />
            </div>
          ))}
        </div>
      )}

      <div className="pt-4">
        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-sky text-white rounded-full font-semibold hover:bg-sky/90 transition"
        >
          {mode === 'update' ? 'Save Changes' : 'Complete Onboarding'}
        </button>
      </div>
    </div>
  </div>
);

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-midnight/80 mb-1">{label}</label>
      {children}
    </div>
  );
}
}