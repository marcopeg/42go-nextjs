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

// Extract first h1 title from markdown content
function extractFirstH1(content: string): { title: string | null; remainingContent: string } {
  // First, try to match ATX style h1 (# Heading)
  const atxH1Regex = /^#\s+(.+?)(?:\n|$)/m;
  const atxMatch = content.match(atxH1Regex);

  if (atxMatch) {
    const title = atxMatch[1].trim();
    // Remove the h1 from the content
    const updatedContent = content.replace(atxH1Regex, '');
    return { title, remainingContent: updatedContent };
  }

  // If no ATX style h1 is found, try Setext style (Heading\n=====)
  const setextH1Regex = /^(.+?)\n=+\s*(?:\n|$)/m;
  const setextMatch = content.match(setextH1Regex);

  if (setextMatch) {
    const title = setextMatch[1].trim();
    // Remove the h1 from the content
    const updatedContent = content.replace(setextH1Regex, '');
    return { title, remainingContent: updatedContent };
  }

  // If no h1 is found, return the original content
  return { title: null, remainingContent: content };
}

// Extract first paragraph from markdown content
function extractFirstParagraph(content: string): {
  paragraph: string | null;
  remainingContent: string;
} {
  // Skip any blank lines at the beginning
  const contentWithoutLeadingBlankLines = content.replace(/^\s*\n+/, '');

  // Find the first paragraph (text block followed by blank line)
  const paragraphRegex = /^([^\n]+(?:\n[^\n]+)*)(?:\n\s*\n|$)/;
  const match = contentWithoutLeadingBlankLines.match(paragraphRegex);

  if (match) {
    const paragraph = match[1].trim();

    // Only consider it a paragraph if it's not a heading, code block, or list item
    if (
      !paragraph.startsWith('#') &&
      !paragraph.startsWith('```') &&
      !paragraph.startsWith('    ') &&
      !paragraph.startsWith('-') &&
      !paragraph.startsWith('*') &&
      !paragraph.startsWith('>')
    ) {
      // Remove the paragraph from the content
      const updatedContent = contentWithoutLeadingBlankLines.replace(paragraphRegex, '');
      return { paragraph, remainingContent: updatedContent };
    }
  }

  // If no suitable paragraph is found, return the original content
  return { paragraph: null, remainingContent: content };
}

export default async function DocsPage({ params }: DocsPageProps) {
  // Join the slug array to create a path
  const slugPath = params.slug.join('/');

  // Check if the documentation file exists and get content
  const doc = await getDoc(slugPath);

  if (!doc) {
    notFound();
  }

  // Remove frontmatter from the content to prevent duplication
  let contentWithoutFrontmatter = stripFrontmatter(doc.content);
  let extractedTitle = null;
  let extractedSubtitle = null;

  // If title is not in metadata, try to extract it from the first h1
  if (!doc.metadata.title) {
    const { title, remainingContent } = extractFirstH1(contentWithoutFrontmatter);
    if (title) {
      extractedTitle = title;
      contentWithoutFrontmatter = remainingContent;
    }
  }

  // If subtitle is not in metadata, try to extract it from the first paragraph
  if (!doc.metadata.subtitle && !doc.metadata.description) {
    const { paragraph, remainingContent } = extractFirstParagraph(contentWithoutFrontmatter);
    if (paragraph) {
      extractedSubtitle = paragraph;
      contentWithoutFrontmatter = remainingContent;
    }
  }

  // Extract header information from metadata or extracted content
  const headerProps = {
    title: doc.metadata.title || extractedTitle,
    subtitle: doc.metadata.subtitle || doc.metadata.description || extractedSubtitle,
    author: doc.metadata.author,
    publicationDate: doc.metadata.date || doc.metadata.publicationDate,
  };

  // Determine if we should skip the first heading
  // Skip if we have a title in the header component (either from metadata or extracted)
  const shouldSkipFirstHeading = !!headerProps.title;

  return (
    <div className="py-4 md:py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8 lg:min-h-[calc(100vh-8rem)]">
      <div className="">
        {/* Small desktop: TOC at the top (hidden on mobile and large desktop) */}
        <div className="hidden md:block lg:hidden mb-8">
          <TableOfContents markdown={contentWithoutFrontmatter} position="top" />
        </div>

        {/* Main content */}
        <div className="py-4 md:py-0">
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
      </div>

      {/* Large desktop: TOC on right side (hidden on mobile and small desktop) */}
      <div className="hidden lg:block h-full">
        <div className="sticky top-24 h-[calc(100vh-4rem)] overflow-y-auto">
          <h3 className="text-lg font-bold">Table of Contents</h3>
          <div className="py-4">
            <TableOfContents markdown={contentWithoutFrontmatter} position="side" />
          </div>
        </div>
      </div>
    </div>
  );
}
