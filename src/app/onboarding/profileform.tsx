'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export interface UserProfile {
  full_name?: string;
  country?: string;
  city?: string;
  training_level?: string;
  institution?: string;
  receive_email?: boolean;
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
    receive_email = false,
    subspecialty_interest = '',
  } = initialValues;

  const [fullName, setFullName] = useState(full_name);
  const [userCountry, setCountry] = useState(country);
  const [userCity, setCity] = useState(city);
  const [trainingLevel, setTrainingLevel] = useState(training_level);
  const [userInstitution, setInstitution] = useState(institution);
  const [receiveEmails, setReceiveEmails] = useState(receive_email);
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
      receive_email: receiveEmails,
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-navy">
        {mode === 'update' ? 'Update Your Profile' : 'Set Up Your Profile'}
      </h1>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Full Name"
          className="w-full p-2 border rounded"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Country"
          className="w-full p-2 border rounded"
          value={userCountry}
          onChange={(e) => setCountry(e.target.value)}
        />
        <input
          type="text"
          placeholder="City"
          className="w-full p-2 border rounded"
          value={userCity}
          onChange={(e) => setCity(e.target.value)}
        />

        <select
          value={trainingLevel}
          onChange={(e) => setTrainingLevel(e.target.value)}
          className="w-full p-2 border rounded bg-white"
        >
          <option value="">Select your training level</option>
          {trainingLevels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Current Institution"
          className="w-full p-2 border rounded"
          value={userInstitution}
          onChange={(e) => setInstitution(e.target.value)}
        />

        <input
          type="text"
          placeholder="Subspecialty Interest"
          className="w-full p-2 border rounded"
          value={subspecialty}
          onChange={(e) => setSubspecialty(e.target.value)}
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={receiveEmails}
            onChange={(e) => setReceiveEmails(e.target.checked)}
          />
          Receive occasional email updates
        </label>
      </div>

      {trainingHistory.length > 0 && mode === 'onboarding' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-navy">Training History</h2>
          {trainingHistory.map((t, index) => (
            <div key={index} className="border p-4 rounded space-y-2">
              <label className="block text-sm font-medium text-midnight/80">
                {t.label}
              </label>
              <input
                type="text"
                placeholder={`${t.label} Name`}
                className="w-full p-2 border rounded"
                value={t.institution}
                onChange={(e) =>
                  updateTrainingField(index, 'institution', e.target.value)
                }
              />
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={t.graduation_date}
                onChange={(e) =>
                  updateTrainingField(index, 'graduation_date', e.target.value)
                }
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSubmit}
        className="w-full py-3 bg-sky text-white rounded-full font-semibold hover:bg-sky/90 transition"
      >
        {mode === 'update' ? 'Save Changes' : 'Complete Onboarding'}
      </button>
    </div>
  );
}
