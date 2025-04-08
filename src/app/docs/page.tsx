import Link from 'next/link';
import { getAllDocsWithMeta } from '@/lib/docs';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Browse all available documentation',
};

export default async function DocsPage() {
  // Get docs with metadata
  const docs = await getAllDocsWithMeta();

  return (
    <div className="py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Documentation</h1>

        {docs.length === 0 ? (
          <p className="text-lg">No documentation files found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {docs.map(doc => (
              <Link
                key={doc.slug}
                href={`/docs/${doc.slug}`}
                className="block p-6 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary hover:shadow-md transition-all bg-white dark:bg-gray-800"
              >
                <h2 className="text-xl font-semibold mb-2 text-primary">{doc.title || doc.slug}</h2>
                {doc.description && (
                  <p className="text-gray-600 dark:text-gray-300 line-clamp-2">{doc.description}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{doc.slug}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
