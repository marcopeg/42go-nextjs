import { notFound } from 'next/navigation';
import { doesDocExist, getDocContent } from '@/lib/docs';

interface DocsPageProps {
  params: {
    slug: string[];
  };
}

export default async function DocsPage({ params }: DocsPageProps) {
  // Join the slug array to create a path
  const slugPath = params.slug.join('/');

  // Check if the documentation file exists
  if (!(await doesDocExist(slugPath))) {
    notFound();
  }

  // Load the document content
  const content = await getDocContent(slugPath);

  if (!content) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Documentation</h1>
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap">{content}</pre>
      </div>
    </div>
  );
}
