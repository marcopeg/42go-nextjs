import { createHeadingId } from "@/42go/components/Markdown";

export interface HeadingElement {
  id: string;
  textContent: string;
  tagName: string;
}

export function extractHeadings(content: string): HeadingElement[] {
  // Remove fenced code blocks
  let processed = content.replace(/```[\s\S]*?```/g, "");
  // Remove indented code blocks
  processed = processed.replace(/^( {4}|\t).*$/gm, "");
  // Remove inline code
  processed = processed.replace(/`[^`]*`/g, "");
  // Remove HTML tags
  processed = processed.replace(/<[^>]*>/g, "");
  // Remove tables
  processed = processed.replace(/^\|.*\|$/gm, "");
  processed = processed.replace(/^[- |:]+$/gm, "");

  // Extract headings
  const headingRegex = /^(#{1,3})\s+(.+?)(?:\n|$)/gm;
  const matches = Array.from(processed.matchAll(headingRegex));

  return matches.map((match) => {
    const level = match[1].length;
    const text = match[2].trim();
    const id = createHeadingId(text);
    return {
      id,
      textContent: text,
      tagName: `H${level}`,
    };
  });
}
