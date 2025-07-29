import { notFound, redirect } from "next/navigation";
import { getDoc, shouldRedirectUrl } from "@/lib/docs";
import { Metadata } from "next";
import MarkdownRenderer from "@/components/docs/MarkdownRenderer";
import DocHeader from "@/components/docs/DocHeader";
import TableOfContents from "@/components/docs/TableOfContents";
import { appPage } from "@/lib/config/app-config-pages";

interface DocsPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateMetadata({
  params,
}: DocsPageProps): Promise<Metadata> {
  const _params = await params;
  const slugPath = _params.slug.join("/");
  const doc = await getDoc(slugPath);

  if (!doc) {
    return {
      title: "Documentation Not Found",
    };
  }

  return {
    title: doc.metadata.title || `Documentation: ${slugPath}`,
    description:
      doc.metadata.description || `Documentation page for ${slugPath}`,
  };
}

// Helper function to strip frontmatter from markdown content
function stripFrontmatter(content: string): string {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");
}

// Extract first h1 title from markdown content
function extractFirstH1(content: string): {
  title: string | null;
  remainingContent: string;
} {
  // First, try to match ATX style h1 (# Heading)
  const atxH1Regex = /^#\s+(.+?)(?:\n|$)/m;
  const atxMatch = content.match(atxH1Regex);

  if (atxMatch) {
    const title = atxMatch[1].trim();
    // Remove the h1 from the content
    const updatedContent = content.replace(atxH1Regex, "");
    return { title, remainingContent: updatedContent };
  }

  // If no ATX style h1 is found, try Setext style (Heading\n=====)
  const setextH1Regex = /^(.+?)\n=+\s*(?:\n|$)/m;
  const setextMatch = content.match(setextH1Regex);

  if (setextMatch) {
    const title = setextMatch[1].trim();
    // Remove the h1 from the content
    const updatedContent = content.replace(setextH1Regex, "");
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
  const contentWithoutLeadingBlankLines = content.replace(/^\s*\n+/, "");

  // Find the first paragraph (text block followed by blank line)
  const paragraphRegex = /^([^\n]+(?:\n[^\n]+)*)(?:\n\s*\n|$)/;
  const match = contentWithoutLeadingBlankLines.match(paragraphRegex);

  if (match) {
    const paragraph = match[1].trim();

    // Only consider it a paragraph if it's not a heading, code block, or list item
    if (
      !paragraph.startsWith("#") &&
      !paragraph.startsWith("```") &&
      !paragraph.startsWith("    ") &&
      !paragraph.startsWith("-") &&
      !paragraph.startsWith("*") &&
      !paragraph.startsWith(">")
    ) {
      // Remove the paragraph from the content
      const updatedContent = contentWithoutLeadingBlankLines.replace(
        paragraphRegex,
        ""
      );
      return { paragraph, remainingContent: updatedContent };
    }
  }

  // If no suitable paragraph is found, return the original content
  return { paragraph: null, remainingContent: content };
}

// Function to check if markdown has headings
function hasHeadings(markdown: string): boolean {
  // Preprocess the markdown to remove code blocks and other complex content
  let processedMarkdown = markdown;

  // Remove fenced code blocks (```code```)
  processedMarkdown = processedMarkdown.replace(/```[\s\S]*?```/g, "");

  // Remove indented code blocks (4 spaces or tab at beginning of line)
  processedMarkdown = processedMarkdown.replace(/^( {4}|\t).*$/gm, "");

  // Remove inline code (backticks)
  processedMarkdown = processedMarkdown.replace(/`[^`]*`/g, "");

  // Remove HTML tags to avoid parsing headers in HTML
  processedMarkdown = processedMarkdown.replace(/<[^>]*>/g, "");

  // Remove tables
  processedMarkdown = processedMarkdown.replace(/^\|.*\|$/gm, "");
  processedMarkdown = processedMarkdown.replace(/^[- |:]+$/gm, "");

  // Check for headings
  const headingRegex = /^(#{1,3})\s+(.+?)(?:\n|$)/gm;
  return headingRegex.test(processedMarkdown);
}

const DocsPage = async ({ params }: DocsPageProps) => {
  // Join the slug array to create a path
  const _params = await params;
  const slugPath = _params.slug.join("/");

  // Check if URL contains README and redirect if needed (301 redirect)
  const redirectPath = shouldRedirectUrl(slugPath);
  if (redirectPath !== null) {
    const redirectUrl = redirectPath ? `/docs/${redirectPath}` : "/docs";
    redirect(redirectUrl);
  }

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
    const { title, remainingContent } = extractFirstH1(
      contentWithoutFrontmatter
    );
    if (title) {
      extractedTitle = title;
      contentWithoutFrontmatter = remainingContent;
    }
  }

  // If subtitle is not in metadata, try to extract it from the first paragraph
  if (!doc.metadata.subtitle && !doc.metadata.description) {
    const { paragraph, remainingContent } = extractFirstParagraph(
      contentWithoutFrontmatter
    );
    if (paragraph) {
      extractedSubtitle = paragraph;
      contentWithoutFrontmatter = remainingContent;
    }
  }

  // Extract header information from metadata or extracted content
  const headerProps = {
    title: doc.metadata.title || extractedTitle || undefined,
    subtitle:
      doc.metadata.subtitle ||
      doc.metadata.description ||
      extractedSubtitle ||
      undefined,
    author: doc.metadata.author,
    publicationDate: doc.metadata.date || doc.metadata.publicationDate,
  };

  // Determine if we should skip the first heading
  // Skip if we have a title in the header component (either from metadata or extracted)
  const shouldSkipFirstHeading = !!headerProps.title;

  // Check if the content has headings for TOC
  const hasTableOfContents = hasHeadings(contentWithoutFrontmatter);

  return (
    <div className="py-4 md:py-8 lg:min-h-[calc(100vh-8rem)]">
      {/* Small desktop: TOC at the top (hidden on mobile and large desktop) */}
      {hasTableOfContents && (
        <div className="hidden md:block lg:hidden mb-8">
          <TableOfContents
            markdown={contentWithoutFrontmatter}
            position="top"
          />
        </div>
      )}

      <div
        className={
          hasTableOfContents
            ? "lg:grid lg:grid-cols-[3fr_1fr] lg:gap-6 xl:gap-8"
            : ""
        }
      >
        {/* Main content */}
        <div className="py-4 md:py-0">
          <div className="max-w-2xl">
            <DocHeader {...headerProps} />

            {/* Mobile: TOC between header and content (hidden on desktop) */}
            {hasTableOfContents && (
              <div className="md:hidden mb-8">
                <TableOfContents
                  markdown={contentWithoutFrontmatter}
                  position="mobile"
                />
              </div>
            )}

            <div className="prose prose-slate dark:prose-invert max-w-none w-full">
              <MarkdownRenderer
                content={contentWithoutFrontmatter}
                skipFirstHeading={shouldSkipFirstHeading}
                title={headerProps.title}
              />
            </div>
          </div>
        </div>

        {/* Large desktop: TOC on right side (hidden on mobile and small desktop) */}
        {hasTableOfContents && (
          <div className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <div className="bg-white dark:bg-gray-900 pl-6">
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
                  Table of Contents
                </h3>
                <div className="pb-4">
                  <TableOfContents
                    markdown={contentWithoutFrontmatter}
                    position="side"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default appPage(DocsPage, "docs");
