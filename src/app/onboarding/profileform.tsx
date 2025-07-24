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
    receive_email = true, // Default to true (auto-checked)
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

  const inputClass =
    'w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky focus:outline-none';
  const labelClass = 'block text-sm font-medium text-midnight/80';

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-navy">
  {mode === 'onboarding' ? 'Set Up Your Profile' : 'Update Your Profile'}
</h1>


      <div className="space-y-6">
        <div>
          <label className={labelClass}>Full Name</label>
          <input
            type="text"
            placeholder="Full Name"
            className={inputClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Country</label>
          <CountrySelect value={userCountry} onChange={setCountry} />
        </div>

        <div>
          <label className={labelClass}>City</label>
          <input
            type="text"
            placeholder="City"
            className={inputClass}
            value={userCity}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Training Level</label>
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
        </div>

        <div>
          <label className={labelClass}>Current Institution</label>
          <input
            type="text"
            placeholder="Institution"
            className={inputClass}
            value={userInstitution}
            onChange={(e) => setInstitution(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Subspecialty Interest</label>
          <input
            type="text"
            placeholder="Subspecialty"
            className={inputClass}
            value={subspecialty}
            onChange={(e) => setSubspecialty(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-3 mt-2 text-sm font-medium text-midnight/80">
          <input
            type="checkbox"
            checked={receiveEmails}
            onChange={(e) => setReceiveEmails(e.target.checked)}
            className="w-4 h-4"
          />
          Receive occasional email updates
        </label>
      </div>

      {trainingHistory.length > 0 && mode === 'onboarding' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-navy">Training History</h2>
          {trainingHistory.map((t, index) => (
            <div key={index} className="border p-4 rounded-lg space-y-2 bg-white">
              <label className={labelClass}>{t.label}</label>
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

      <button
        onClick={handleSubmit}
        className="w-full py-3 bg-sky text-white rounded-full font-semibold hover:bg-sky/90 transition"
      >
        {mode === 'update' ? 'Save Changes' : 'Complete Onboarding'}
      </button>
    </div>
  );
}
