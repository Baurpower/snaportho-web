import { redirect } from 'next/navigation';

import {
  CasePrepReviewAuthError,
  requireCasePrepReviewer,
} from '@/lib/caseprep-review/access-control';
import { BroBotQualityDashboard } from '@/components/brobot-quality/BroBotQualityDashboard';

export const dynamic = 'force-dynamic';

export default async function BroBotQualityPage() {
  let ctx;
  try {
    ctx = await requireCasePrepReviewer({ minRole: 'content_admin' });
  } catch (err) {
    if (err instanceof CasePrepReviewAuthError) {
      if (err.status === 401) {
        redirect('/auth/login?next=/admin/brobot-quality');
      }
      return (
        <div className="max-w-md mx-auto mt-24 text-center px-4">
          <h1 className="text-xl font-bold text-gray-800">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-500">{err.message}</p>
        </div>
      );
    }
    throw err;
  }

  return <BroBotQualityDashboard reviewerName={ctx.displayName} />;
}
