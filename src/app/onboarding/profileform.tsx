'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import CountrySelect from './countryselect';

export interface TrainingEntry {
  id?: string;
  label: string;
  institution: string;
  graduation_date: string;
}

export interface UserProfile {
  full_name?: string;
  email?: string;
  country?: string;
  city?: string;
  training_level?: string;
  institution?: string;
  receive_emails?: boolean;
  subspecialty_interest?: string;
  training_history?: TrainingEntry[];
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
  const { user } = useAuth();

  // Destructure profile basics
  const {
    full_name = '',
    email: initialEmail = '',
    country = '',
    city = '',
    training_level = '',
    institution = '',
    receive_emails = true,
    subspecialty_interest = '',
  } = initialValues;

  // Form state
  const [fullName, setFullName] = useState(full_name);
  const [email, setEmail] = useState(initialEmail);
  const [userCountry, setCountry] = useState(country);
  const [userCity, setCity] = useState(city);
  const [trainingLevel, setTrainingLevel] = useState(training_level);
  const [userInstitution, setInstitution] = useState(institution);
  const [receiveEmails, setReceiveEmails] = useState(receive_emails);
  const [subspecialty, setSubspecialty] = useState(subspecialty_interest);

  // Training history rows
  const [trainingHistory, setTrainingHistory] = useState<TrainingEntry[]>([]);

  // 1) Autofill email from Supabase
  useEffect(() => {
    if (!email) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) setEmail(user.email);
      });
    }
  }, [email]);

  // 2) In update mode: fetch saved history
  useEffect(() => {
    if (mode === 'update' && user?.id) {
      supabase
        .from('user_training_history')
        .select('id, role, institution, graduation_date')
        .eq('user_id', user.id)
        .then((res) => {
          if (res.error) {
            console.error('Failed to load training history', res.error);
            return;
          }
          const rows = res.data as Array<{
            id: string;
            role: string;
            institution: string;
            graduation_date: string;
          }> | null;

          if (rows) {
            setTrainingHistory(
              rows.map((row) => ({
                id: row.id,
                label: row.role,
                institution: row.institution,
                graduation_date: row.graduation_date,
              }))
            );
          }
        });
    }
  }, [mode, user?.id]);

  // 3) In onboarding mode: generate default rows when level changes
  useEffect(() => {
    if (mode !== 'onboarding') return;
    let labels: string[] = [];
    if (['RN', 'NP', 'NP Student'].includes(trainingLevel)) {
      labels = ['Nursing School'];
    } else if (trainingLevel === 'MD/DO Student') {
      labels = ['Medical School'];
    } else if (trainingLevel === 'MD/DO Resident') {
      labels = ['Medical School', 'Residency'];
    } else if (['MD/DO Fellow', 'MD/DO Attending'].includes(trainingLevel)) {
      labels = ['Medical School', 'Residency', 'Fellowship'];
    } else if (['PA Student', 'PA-C'].includes(trainingLevel)) {
      labels = ['PA Program'];
    } else if (trainingLevel === 'Premed Student') {
      labels = ['Undergraduate Program'];
    }
    setTrainingHistory(
      labels.map((label) => ({
        label,
        institution: '',
        graduation_date: '',
      }))
    );
  }, [mode, trainingLevel]);

  // Helpers to modify rows
  const updateTrainingField = (
    idx: number,
    field: keyof TrainingEntry,
    value: string
  ) => {
    setTrainingHistory((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };
  const addEntry = () =>
    setTrainingHistory((prev) => [
      ...prev,
      { label: '', institution: '', graduation_date: '' },
    ]);

  // Submit handler
  const handleSubmit = async () => {
    // ensure logged in
    const {
      data: { user: u },
      error: userErr,
    } = await supabase.auth.getUser();
    if (!u || userErr) {
      return alert('You must be logged in.');
    }

    // Upsert profile
    const { error: profErr } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: u.id,
        email,
        full_name: fullName,
        country: userCountry,
        city: userCity,
        training_level: trainingLevel,
        institution: userInstitution,
        receive_emails: receiveEmails,
        subspecialty_interest: subspecialty,
      });
    if (profErr) {
      console.error(profErr);
      return alert('Failed to save profile.');
    }

    // Prepare valid training entries
    const valid = trainingHistory.filter(
      (t) => t.label && t.institution && t.graduation_date
    );
    if (valid.length) {
      const payload = valid.map((t) => ({
        id: t.id ?? uuidv4(),
        user_id: u.id,
        role: t.label,
        institution: t.institution,
        graduation_date: t.graduation_date,
      }));
      const { error: histErr } = await supabase
        .from('user_training_history')
        .upsert(payload);
      if (histErr) {
        console.error(histErr);
        return alert('Failed to save training history.');
      }
    }

    router.push(mode === 'update' ? '/learn' : '/onboarding/complete');
  };

  const inputClass =
    'w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky focus:outline-none';

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="pt-8 text-3xl font-bold text-navy">
          {mode === 'onboarding' ? 'Set Up Your Profile' : 'Update Your Profile'}
        </h1>
        <p className="text-midnight/70 text-sm">
          This information helps us personalize your experience.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-8">
        {/* Personal Info */}
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

          <FormField label="Preferred Email">
            <input
              type="email"
              placeholder="you@example.com"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              {trainingLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
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

        {/* Training History */}
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-navy">Training History</h2>
            <button
              type="button"
              onClick={addEntry}
              className="text-sky hover:underline text-sm"
            >
              + Add Entry
            </button>
          </div>

          {trainingHistory.map((t, idx) => (
            <div
              key={idx}
              className="border border-gray-200 bg-white p-5 rounded-xl space-y-3"
            >
              <FormField label="Label">
                <input
                  type="text"
                  placeholder="e.g. Medical School"
                  className={inputClass}
                  value={t.label}
                  onChange={(e) => updateTrainingField(idx, 'label', e.target.value)}
                />
              </FormField>

              <FormField label="Institution">
                <input
                  type="text"
                  placeholder={`${t.label || 'Institution'} Name`}
                  className={inputClass}
                  value={t.institution}
                  onChange={(e) =>
                    updateTrainingField(idx, 'institution', e.target.value)
                  }
                />
              </FormField>

              <FormField label="Graduation Date">
                <input
                  type="date"
                  className={inputClass}
                  value={t.graduation_date}
                  onChange={(e) =>
                    updateTrainingField(idx, 'graduation_date', e.target.value)
                  }
                />
              </FormField>
            </div>
          ))}
        </div>

        {/* Submit */}
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
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-midnight/80 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
