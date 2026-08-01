'use client';

import { QuickShareHome } from '@/lib/quickshare/components/QuickShareHome';
import { useParams } from 'next/navigation';

const QuickShareResourcePage = () => {
  const params = useParams<{ resourceId: string }>();

  return <QuickShareHome resourceId={params.resourceId} />;
};

export default QuickShareResourcePage;
