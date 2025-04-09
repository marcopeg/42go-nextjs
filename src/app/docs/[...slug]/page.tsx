import { notFound } from 'next/navigation';
import { getDoc } from '@/lib/docs';
import { Metadata } from 'next';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import DocHeader from '@/components/DocHeader';
import TableOfContents from '@/components/TableOfContents';

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

// Helper function to strip frontmatter from markdown content
function stripFrontmatter(content: string): string {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
}

export default async function DocsPage({ params }: DocsPageProps) {
  // Join the slug array to create a path
  const slugPath = params.slug.join('/');

  // Check if the documentation file exists and get content
  const doc = await getDoc(slugPath);

  if (!doc) {
    notFound();
  }

  // Extract header information from metadata
  const headerProps = {
    title: doc.metadata.title,
    subtitle: doc.metadata.subtitle || doc.metadata.description,
    author: doc.metadata.author,
    publicationDate: doc.metadata.date || doc.metadata.publicationDate,
  };

  // Determine if we should skip the first heading
  // Skip if we have a title in the header component
  const shouldSkipFirstHeading = !!headerProps.title;

  // Remove frontmatter from the content to prevent duplication
  const contentWithoutFrontmatter = stripFrontmatter(doc.content);

  return (
    <div className="py-8">
      <div className="max-w-5xl mx-auto">
        {/* Small desktop: TOC at the top (hidden on mobile and large desktop) */}
        <div className="hidden md:block lg:hidden mb-8">
          <TableOfContents markdown={contentWithoutFrontmatter} position="top" />
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8">
          <div>
            <DocHeader {...headerProps} />

            {/* Mobile: TOC between header and content (hidden on desktop) */}
            <div className="md:hidden mb-8">
              <TableOfContents markdown={contentWithoutFrontmatter} position="mobile" />
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none">
              <MarkdownRenderer
                content={contentWithoutFrontmatter}
                skipFirstHeading={shouldSkipFirstHeading}
                title={headerProps.title}
              />
            </div>
          </div>

          {/* Large desktop: TOC on right side (hidden on mobile and small desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <TableOfContents markdown={contentWithoutFrontmatter} position="side" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
