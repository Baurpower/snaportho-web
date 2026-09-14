import { redirect } from 'next/navigation';

import { AnkiUsageDashboard } from '@/components/anki-usage/AnkiUsageDashboard';
import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from '@/lib/caseprep-review/access-control';

export const dynamic = 'force-dynamic';

export default async function AnkiUsagePage() {
  try {
    await requireCasePrepReviewer({ minRole: 'content_admin' });
  } catch (error) {
    if (error instanceof CasePrepReviewAuthError) {
      if (error.status === 401) {
        redirect('/auth/sign-in?redirectTo=%2Fadmin%2Fanki-usage');
      }
      return (
        <div className="mx-auto mt-24 max-w-md px-4 text-center">
          <h1 className="text-xl font-bold text-gray-800">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-500">{error.message}</p>
        </div>
      );
    }
    throw error;
  }

  return <AnkiUsageDashboard />;
}
