import { type Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { readDoc } from "./read-doc";

const shouldRedirect = (slugPath: string): string | null => {
  // Check for README, README.md, README.mdx in various positions
  const patterns = [/(^|\/)README(\.mdx?|$)/];
  for (const pattern of patterns) {
    if (pattern.test(slugPath)) {
      // Remove README, README.md, README.mdx from the path
      const cleanPath = slugPath
        .replace(/\/README(\.mdx?|)(?:\/|$)/g, "/") // Remove /README(.md|.mdx)/ or at end
        .replace(/^README(\.mdx?|)(?:\/|$)/, "") // Remove README(.md|.mdx) at start
        .replace(/\/$/, ""); // Remove trailing slash

      const redirectUrl = cleanPath ? `/docs/${cleanPath}` : "/docs";
      redirect(redirectUrl);
    }
  }
  return null;
};

export const getDocMetadata = async (
  params: Promise<{ slug: string[] }>
): Promise<Metadata> => {
  const _params = await params;
  const slug = _params.slug.join("/");
  const doc = await readDoc(slug);

  return {
    title: doc?.data.title || "DocPage",
    description: doc?.data.description,
    keywords: doc?.data.keywords || [],
  };
};

export const getDocData = async (params: Promise<{ slug: string[] }>) => {
  const _params = await params;
  const slug = _params.slug.join("/");

  shouldRedirect(slug);

  const doc = await readDoc(slug);
  if (!doc) notFound();

  return doc;
};
