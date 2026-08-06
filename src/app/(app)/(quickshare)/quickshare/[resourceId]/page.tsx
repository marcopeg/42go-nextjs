'use client';

import { QuickShareHome } from '@/app/(app)/(quickshare)/quickshare/_components/QuickShareHome';
import { useParams } from 'next/navigation';

const QuickShareResourcePage = () => {
  const params = useParams<{ resourceId: string }>();

  return <QuickShareHome resourceId={params.resourceId} />;
};

export default QuickShareResourcePage;
