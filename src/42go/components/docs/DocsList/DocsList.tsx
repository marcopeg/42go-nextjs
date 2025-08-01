import Link from "next/link";
import { getDocTitle, getDocExcerpt, type DocFile } from "@/42go/utils/docs";
import { ShowDate } from "../../ShowDate";

export const DocsList = ({
  items,
  basePath,
}: {
  items: DocFile[];
  basePath: string;
}) => {
  return (
    <div className="py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Documentation</h1>

        {items.length === 0 ? (
          <p className="text-lg">No documentation files found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((doc) => (
              <Link
                key={doc.path}
                href={`/${basePath}/${doc.slug}`}
                className="block p-6 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary hover:shadow-md transition-all bg-white dark:bg-gray-800"
              >
                <h2 className="text-xl font-semibold mb-2 text-primary">
                  {getDocTitle(doc)}
                </h2>
                {doc.data.date && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    <ShowDate date={doc.data.date} />
                  </p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {getDocExcerpt(doc)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
