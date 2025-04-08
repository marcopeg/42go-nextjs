import Link from 'next/link';
import { getAllDocs } from '@/lib/docs';

export default function DocsPage() {
  const docs = getAllDocs();

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Documentation</h1>

      {docs.length === 0 ? (
        <p className="text-lg">No documentation files found.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map(doc => (
            <li key={doc}>
              <Link href={`/docs/${doc}`} className="text-primary hover:underline">
                {doc}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
