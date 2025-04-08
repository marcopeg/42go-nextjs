import { notFound } from 'next/navigation';
import { getDoc } from '@/lib/docs';
import { Metadata } from 'next';

interface DocsPageProps {
  params: {
    slug: string[];
  };
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const slugPath = params.slug.join('/');
  const doc = await getDoc(slugPath);

  if (!doc) {
    return {
      title: 'Documentation Not Found',
    };
  }

  return {
    title: doc.metadata.title || `Documentation: ${slugPath}`,
    description: doc.metadata.description || `Documentation page for ${slugPath}`,
  };
}

export default async function DocsPage({ params }: DocsPageProps) {
  // Join the slug array to create a path
  const slugPath = params.slug.join('/');

  // Check if the documentation file exists and get content
  const doc = await getDoc(slugPath);

  if (!doc) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">{doc.metadata.title || 'Documentation'}</h1>
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap">{doc.content}</pre>
      </div>
    </div>
  );
}
