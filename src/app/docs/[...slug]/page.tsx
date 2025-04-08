import { notFound } from 'next/navigation';
import { doesDocExist } from '@/lib/docs';

interface DocsPageProps {
  params: {
    slug: string[];
  };
}

export default function DocsPage({ params }: DocsPageProps) {
  // Join the slug array to create a path
  const slugPath = params.slug.join('/');

  // Check if the documentation file exists
  if (!doesDocExist(slugPath)) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Documentation</h1>
      <p className="text-lg">test: {slugPath}</p>
    </div>
  );
}
